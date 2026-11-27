import { Injectable, Logger } from '@nestjs/common';

import { UserInputError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import {
  GrowthOsBillingClient,
  GrowthOsBillingHttpError,
  type GrowthOsBillingSessionKind,
} from 'src/engine/core-modules/growth-os/growth-os-billing.client';
import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { getGrowthOsConfig } from 'src/engine/core-modules/growth-os/growth-os.config';
import {
  getGrowthOsLookupKey,
  type GrowthOsBillingInterval,
  type GrowthOsPlan,
} from 'src/engine/core-modules/growth-os/growth-os-plan.constants';
import { buildBillingPortalLink } from 'src/engine/core-modules/growth-os/utils/billing-portal-link.util';
import { parseGrowthOsEntitlementEvent } from 'src/engine/core-modules/growth-os/utils/parse-growth-os-entitlement-event.util';

export const INTERVAL_CONFLICT_MESSAGE_EN =
  'The billing interval can’t be changed here because your plan is combined with another Growth OS product. Please contact support@scalepoint-ventures.com and we will switch it for you.';
export const INTERVAL_CONFLICT_MESSAGE_DE =
  'Das Abrechnungsintervall lässt sich hier nicht ändern, weil dein Tarif mit einem weiteren Growth-OS-Produkt kombiniert ist. Schreib uns an support@scalepoint-ventures.com, dann stellen wir es für dich um.';

const APP_HOST = 'crm.scalepoint-ventures.com';
const DEFAULT_RETURN_URL = `https://${APP_HOST}/settings/billing`;

// Return targets are limited to the CRM host and its workspace subdomains
// (crm.scalepoint-ventures.com, <workspace>.crm.scalepoint-ventures.com); the service checks it too.
export const resolveBillingReturnUrl = (value?: string): string => {
  try {
    const url = new URL(value ?? '');
    const host = url.hostname;
    const own = host === APP_HOST || host.endsWith(`.${APP_HOST}`);
    const loopback = ['localhost', '127.0.0.1'].includes(host);

    if ((url.protocol === 'https:' && own) || (url.protocol === 'http:' && loopback)) {
      return url.toString();
    }
  } catch {
    // fall through
  }

  return DEFAULT_RETURN_URL;
};

// Orchestrates account creation, checkout/portal links and the initial
// entitlement against growth-os-billing (BILLING_PROVIDER=growth-os), or the
// local mock links (BILLING_PROVIDER=mock).
@Injectable()
export class GrowthOsBillingService {
  private readonly logger = new Logger(GrowthOsBillingService.name);

  constructor(
    private readonly client: GrowthOsBillingClient,
    private readonly entitlementService: GrowthOsEntitlementService,
  ) {}

  // POST /v1/accounts is idempotent (one account per product + workspace id); the
  // answer carries account_id and the current entitlement, which we store.
  async ensureAccount(workspaceId: string) {
    const known = await this.entitlementService.getBillingAccount(workspaceId);

    if (known || !this.client.isLive()) return known;

    const contact = await this.entitlementService.getBillingContact(workspaceId);
    const result = await this.client.request('POST', '/v1/accounts', {
      product: 'crm',
      external_user_id: workspaceId,
      email: contact?.email,
      name: contact?.workspaceName || contact?.name,
      locale: contact?.locale ?? 'en',
      trial: true,
    });

    if (typeof result?.account_id !== 'string') {
      throw new Error('growth-os-billing /v1/accounts returned no account_id');
    }

    const account = {
      workspaceId,
      accountId: result.account_id as string,
      organisationId: (result.organisation_id as string) ?? null,
      email: contact?.email ?? null,
      name: contact?.workspaceName || contact?.name || null,
      locale: contact?.locale ?? 'en',
    };

    await this.entitlementService.saveBillingAccount(account);

    if (result.data) {
      const raw = JSON.stringify({
        id: `evt_gos_${account.accountId}_${result.version ?? 0}`,
        type: 'entitlement.updated',
        version: result.version,
        createdAt: new Date().toISOString(),
        data: result.data,
      });
      const parsed = parseGrowthOsEntitlementEvent(raw);

      if (parsed.ok) await this.entitlementService.applyUpdate(parsed.update);
    }

    return account;
  }

  // Never throws: signup must not depend on the billing service being up.
  ensureAccountBestEffort(workspaceId: string) {
    return this.ensureAccount(workspaceId).catch((error) => {
      this.logger.warn(`Billing account creation failed for ${workspaceId}: ${error}`);

      return null;
    });
  }

  async getSessionUrl(input: {
    kind: GrowthOsBillingSessionKind;
    workspaceId: string;
    plan: GrowthOsPlan;
    interval: GrowthOsBillingInterval;
    seats: number;
    returnUrl: string;
    reason?: string;
  }): Promise<string> {
    if (!this.client.isLive()) {
      return this.client.getMockSessionUrl(input);
    }

    const returnUrl = resolveBillingReturnUrl(input.returnUrl);
    const account = await this.ensureAccount(input.workspaceId).catch(() => null);

    if (input.kind === 'portal') {
      // Billing links go only through the signed /portal link (portal-link.md).
      if (account) return buildBillingPortalLink(account.accountId);

      return getGrowthOsConfig().portalUrl;
    }

    try {
      if (input.kind === 'checkout') {
        const origin = new URL(returnUrl).origin;
        const result = await this.client.request('POST', '/v1/checkout-sessions', {
          product: 'crm',
          external_user_id: input.workspaceId,
          price_lookup_key: getGrowthOsLookupKey(input.plan, input.interval),
          quantity: input.seats,
          success_url: `${origin}/settings/billing?checkout=success`,
          cancel_url: returnUrl,
          ...(account?.email ? { email: account.email } : {}),
          locale: account?.locale ?? 'en',
        });

        // No `mode` is sent. The answer's mode is checkout (hosted payment page), confirm
        // (the service's plan-change page, the org already has a subscription) or noop
        // (nothing to pay: url is our success_url). The customer is redirected to `url` in all three cases.
        if (typeof result?.url === 'string') return result.url;
      } else {
        const result = await this.client.request('POST', '/v1/portal-sessions', {
          product: 'crm',
          external_user_id: input.workspaceId,
          return_url: returnUrl,
          flow: input.kind === 'cancel' ? 'cancel' : 'payment_method',
          ...(input.reason ? { reason: input.reason } : {}),
        });

        if (typeof result?.url === 'string') return result.url;
      }
    } catch (error) {
      if (
        input.kind === 'checkout' &&
        error instanceof GrowthOsBillingHttpError &&
        error.status === 409 &&
        error.code === 'interval_conflict'
      ) {
        // The interval was switched inside a combined plan: only support can change that.
        throw new UserInputError(
          account?.locale === 'de' ? INTERVAL_CONFLICT_MESSAGE_DE : INTERVAL_CONFLICT_MESSAGE_EN,
        );
      }
      this.logger.warn(`Billing session (${input.kind}) failed: ${error}`);
    }

    throw new UserInputError('Billing is unavailable right now. Please try again in a few minutes.');
  }
}

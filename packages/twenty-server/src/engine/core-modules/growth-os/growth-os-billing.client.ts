import { Injectable, Logger } from '@nestjs/common';

import { getGrowthOsConfig } from 'src/engine/core-modules/growth-os/growth-os.config';
import {
  getGrowthOsLookupKey,
  type GrowthOsBillingInterval,
  type GrowthOsPlan,
} from 'src/engine/core-modules/growth-os/growth-os-plan.constants';
import { signGrowthOsPayload } from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';

// 'cancel' asks growth-os-billing for a cancel-confirmation session;
// 'payment_method' opens the payment-method flow of the portal.
export type GrowthOsBillingSessionKind =
  | 'checkout'
  | 'portal'
  | 'cancel'
  | 'payment_method';

export class GrowthOsBillingHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    path: string,
  ) {
    super(`growth-os-billing ${path} answered ${status} (${code})`);
  }
}

// The module secret travels only as an HMAC; the service must be https
// (plain http only for a loopback stub).
export const assertSafeBillingBaseUrl = (value: string): string => {
  const url = new URL(value);
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new Error('GROWTH_OS_BILLING_URL must be https');
  }

  return url.toString().replace(/\/+$/, '');
};

// Thin transport for growth-os-billing (no payment-provider code in the CRM).
// BILLING_PROVIDER=growth-os talks to the documented /v1 API, signed with
// X-Growth-OS-Signature: t=<unix>,v1=HMAC_SHA256(secret, "<t>.<raw body>").
// BILLING_PROVIDER=mock (default) keeps the local demo: static fallback links.
@Injectable()
export class GrowthOsBillingClient {
  private readonly logger = new Logger(GrowthOsBillingClient.name);

  isLive() {
    const { billingProvider, billingUrl, webhookSecret } = getGrowthOsConfig();

    return billingProvider === 'growth-os' && !!billingUrl && !!webhookSecret;
  }

  async request(
    method: 'GET' | 'POST',
    path: string,
    body: Record<string, unknown> = {},
  ) {
    const { billingUrl, webhookSecret } = getGrowthOsConfig();

    if (!billingUrl || !webhookSecret) return undefined;

    const base = assertSafeBillingBaseUrl(billingUrl);
    // GET carries its parameters in the query and signs an empty body.
    const rawBody = method === 'GET' ? '' : JSON.stringify(body);
    const query =
      method === 'GET'
        ? `?${new URLSearchParams(body as Record<string, string>)}`
        : '';
    const response = await fetch(`${base}${path}${query}`, {
      method,
      headers: {
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        'X-Growth-OS-Signature': signGrowthOsPayload(webhookSecret, rawBody),
      },
      ...(method === 'POST' ? { body: rawBody } : {}),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      let code = 'error';

      try {
        code = ((await response.json()) as { error?: string }).error ?? code;
      } catch {
        // non-JSON error body
      }

      throw new GrowthOsBillingHttpError(response.status, code, path);
    }

    return response.status === 204 ? {} : response.json();
  }

  // ---- mock provider (unchanged behaviour of the local demo) ---------------

  async getMockSessionUrl({
    kind,
    workspaceId,
    plan,
    interval,
    seats,
    returnUrl,
    reason,
  }: {
    kind: GrowthOsBillingSessionKind;
    workspaceId: string;
    plan: GrowthOsPlan;
    interval: GrowthOsBillingInterval;
    seats: number;
    returnUrl: string;
    reason?: string;
  }): Promise<string> {
    const lookupKey = getGrowthOsLookupKey(plan, interval);

    try {
      const result = await this.request('POST', '/crm/sessions', {
        kind,
        product: 'crm',
        workspaceId,
        lookupKey,
        seats,
        returnUrl,
        ...(reason ? { reason } : {}),
      });

      if (typeof result?.url === 'string') return result.url;
    } catch (error) {
      this.logger.warn(`Billing session request failed: ${error}`);
    }

    const { checkoutUrl, portalUrl } = getGrowthOsConfig();

    if (kind !== 'checkout') return portalUrl;

    const url = new URL(checkoutUrl);

    url.searchParams.set('product', 'crm');
    url.searchParams.set('workspace', workspaceId);
    url.searchParams.set('lookup_key', lookupKey);
    url.searchParams.set('seats', String(seats));

    return url.toString();
  }

  // Best effort: billing adjusts the licensed quantity; failures are logged only.
  pushSeatCount(workspaceId: string, seatsUsed: number) {
    const { billingProvider } = getGrowthOsConfig();
    const call =
      billingProvider === 'growth-os'
        ? this.request('POST', '/v1/seats', {
            product: 'crm',
            external_user_id: workspaceId,
            seats: seatsUsed,
          })
        : this.request('POST', '/crm/seats', {
            product: 'crm',
            workspaceId,
            seatsUsed,
          });

    call.catch((error) => this.logger.warn(`Seat push failed: ${error}`));
  }
}

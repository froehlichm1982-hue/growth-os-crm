import { Injectable, Logger } from '@nestjs/common';

import { getGrowthOsConfig } from 'src/engine/core-modules/growth-os/growth-os.config';
import {
  getGrowthOsLookupKey,
  type GrowthOsBillingInterval,
  type GrowthOsPlan,
} from 'src/engine/core-modules/growth-os/growth-os-plan.constants';
import { signGrowthOsPayload } from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';

// 'cancel' asks growth-os-billing for a cancel-confirmation session (Stripe
// portal subscription_cancel flow); without the service it falls back to the portal.
export type GrowthOsBillingSessionKind = 'checkout' | 'portal' | 'cancel';

// Thin client for growth-os-billing (private service; no Stripe code here).
// Expected API (documented in GROWTH-OS-BILLING.md):
//   POST {GROWTH_OS_BILLING_URL}/crm/sessions  -> { url }
//   POST {GROWTH_OS_BILLING_URL}/crm/seats     -> 204
// Both requests carry X-Growth-OS-Signature (same HMAC as the inbound webhook).
// Without GROWTH_OS_BILLING_URL the app falls back to GROWTH_OS_CHECKOUT_URL /
// GROWTH_OS_PORTAL_URL with query parameters, so the UI always has a link.
@Injectable()
export class GrowthOsBillingClient {
  private readonly logger = new Logger(GrowthOsBillingClient.name);

  private async post(path: string, body: Record<string, unknown>) {
    const { billingUrl, webhookSecret } = getGrowthOsConfig();

    if (!billingUrl || !webhookSecret) return undefined;

    const rawBody = JSON.stringify(body);
    const response = await fetch(`${billingUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Growth-OS-Signature': signGrowthOsPayload(webhookSecret, rawBody),
      },
      body: rawBody,
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`growth-os-billing ${path} answered ${response.status}`);
    }

    return response.status === 204 ? {} : response.json();
  }

  async getSessionUrl({
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
      const result = await this.post('/crm/sessions', {
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

    if (kind === 'portal' || kind === 'cancel') return portalUrl;

    const url = new URL(checkoutUrl);

    url.searchParams.set('product', 'crm');
    url.searchParams.set('workspace', workspaceId);
    url.searchParams.set('lookup_key', lookupKey);
    url.searchParams.set('seats', String(seats));

    return url.toString();
  }

  // Best effort: billing adjusts the licensed quantity; failures are logged only.
  pushSeatCount(workspaceId: string, seatsUsed: number) {
    this.post('/crm/seats', { product: 'crm', workspaceId, seatsUsed }).catch(
      (error) => this.logger.warn(`Seat push failed: ${error}`),
    );
  }
}

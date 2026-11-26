import { createHmac } from 'crypto';

// Signed "Manage billing" link for module mails
// (billing-service/docs/integration/portal-link.md). Server side only: the
// secret never leaves the server, and the link goes only to the account's own
// billing email. Mails never link to a payment-provider URL.
export const GROWTH_OS_BILLING_PORTAL_BASE =
  'https://billing.scalepoint-ventures.com';

export const buildBillingPortalLink = (
  accountId: string,
  options: {
    module?: 'outreach' | 'connect' | 'booking' | 'crm';
    ttlSeconds?: number;
    secret?: string;
    base?: string;
    nowSeconds?: number;
  } = {},
): string => {
  const secret =
    options.secret ?? process.env.GROWTH_OS_BILLING_WEBHOOK_SECRET ?? '';

  if (secret === '') {
    throw new Error('GROWTH_OS_BILLING_WEBHOOK_SECRET is not set');
  }

  const module = options.module ?? 'crm';
  const base = (options.base ?? GROWTH_OS_BILLING_PORTAL_BASE).replace(/\/+$/, '');
  const exp =
    (options.nowSeconds ?? Math.floor(Date.now() / 1000)) +
    (options.ttlSeconds ?? 7 * 86400);
  const sig = createHmac('sha256', secret)
    .update(`portal.${module}.${accountId}.${exp}`)
    .digest('hex');

  return `${base}/portal?${new URLSearchParams({
    a: accountId,
    m: module,
    exp: String(exp),
    sig,
  })}`;
};

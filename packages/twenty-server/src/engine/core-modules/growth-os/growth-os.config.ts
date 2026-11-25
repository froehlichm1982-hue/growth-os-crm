// Growth OS env config, read directly from process.env so the fork does not
// touch upstream config-variables.ts (merge-friendly). Never commit values.
//
// GROWTH_OS_BILLING_WEBHOOK_SECRET  HMAC secret shared with growth-os-billing (required to accept webhooks)
// GROWTH_OS_BILLING_URL             base URL of growth-os-billing (optional; enables checkout/portal sessions + seat push)
// GROWTH_OS_CHECKOUT_URL            fallback checkout page (default: marketing pricing page)
// GROWTH_OS_PORTAL_URL              fallback billing portal page (default: mailto support)
// GROWTH_OS_UNPAID_ACCESS           read_only (default) | starter: what happens after the 7-day grace
// GROWTH_OS_AI_MONTHLY_CAP          AI requests per workspace per month on Scale (default 500)
// GROWTH_OS_ENTITLEMENTS_DISABLED   true = no gates (instance admin / dev escape hatch)

import { GROWTH_OS_DEFAULT_AI_MONTHLY_CAP } from 'src/engine/core-modules/growth-os/growth-os-plan.constants';

const env = (key: string) => {
  const value = process.env[key];

  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;
};

export const getGrowthOsConfig = () => ({
  webhookSecret: env('GROWTH_OS_BILLING_WEBHOOK_SECRET'),
  billingUrl: env('GROWTH_OS_BILLING_URL')?.replace(/\/+$/, ''),
  checkoutUrl:
    env('GROWTH_OS_CHECKOUT_URL') ??
    'https://scalepoint-ventures.com/growthos/crm#pricing',
  portalUrl:
    env('GROWTH_OS_PORTAL_URL') ??
    'mailto:support@scalepoint-ventures.com?subject=Growth%20OS%20CRM%20billing',
  unpaidAccess:
    env('GROWTH_OS_UNPAID_ACCESS') === 'starter' ? 'starter' : 'read_only',
  aiMonthlyCap:
    Number(env('GROWTH_OS_AI_MONTHLY_CAP')) > 0
      ? Number(env('GROWTH_OS_AI_MONTHLY_CAP'))
      : GROWTH_OS_DEFAULT_AI_MONTHLY_CAP,
  entitlementsDisabled: env('GROWTH_OS_ENTITLEMENTS_DISABLED') === 'true',
});

export type GrowthOsConfig = ReturnType<typeof getGrowthOsConfig>;

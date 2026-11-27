// Growth OS env config, read directly from process.env so the fork does not
// touch upstream config-variables.ts (merge-friendly). Never commit values.
//
// BILLING_PROVIDER                  mock (default: local demo, static fallback links) | growth-os (shared billing service)
// GROWTH_OS_BILLING_WEBHOOK_SECRET  HMAC secret shared with growth-os-billing (MODULE_CRM_WEBHOOK_SECRET; signs calls both ways)
// GROWTH_OS_BILLING_SECRET          alias of the above (either one works; server env only, never in git)
// GROWTH_OS_BILLING_MAILS           off (default: the billing service sends dunning mail) | crm (the CRM sends payment-failed and cancellation mail)
// GROWTH_OS_BILLING_SWEEP_SECONDS   interval of the day-3/day-6 dunning sweep when the CRM sends billing mail (default 3600)
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
  webhookSecret:
    env('GROWTH_OS_BILLING_WEBHOOK_SECRET') ?? env('GROWTH_OS_BILLING_SECRET'),
  billingProvider:
    env('BILLING_PROVIDER') === 'growth-os'
      ? ('growth-os' as const)
      : ('mock' as const),
  billingMails:
    env('GROWTH_OS_BILLING_MAILS') === 'crm'
      ? ('crm' as const)
      : ('off' as const),
  billingSweepSeconds:
    Number(env('GROWTH_OS_BILLING_SWEEP_SECONDS')) > 0
      ? Number(env('GROWTH_OS_BILLING_SWEEP_SECONDS'))
      : 3600,
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

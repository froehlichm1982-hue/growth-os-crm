// Growth OS env config, read directly from process.env so the fork does not
// touch upstream config-variables.ts (merge-friendly). Never commit values.
//
// BILLING_PROVIDER                  mock (default: local demo, static fallback links) | growth-os (shared billing service)
// MODULE_CRM_WEBHOOK_SECRET_FILE    path of a 600 file holding the CRM module secret (preferred; also GROWTH_OS_BILLING_SECRET_FILE).
//                                   If set, the file is used; unreadable/empty = no secret (fail closed, no fallback to env).
// MODULE_CRM_WEBHOOK_SECRET         the same secret as env value (also GROWTH_OS_BILLING_WEBHOOK_SECRET / GROWTH_OS_BILLING_SECRET)
//                                   One secret signs API calls (both ways), pushes and /portal links. Never logged.
// The CRM sends NO billing mail: payment-failed, cancellation, invoice and receipt mail all come from growth-os-billing.
// GROWTH_OS_BILLING_URL             base URL of growth-os-billing (optional; enables checkout/portal sessions + seat push)
// GROWTH_OS_CHECKOUT_URL            fallback checkout page (default: marketing pricing page)
// GROWTH_OS_PORTAL_URL              fallback billing portal page (default: mailto support)
// GROWTH_OS_UNPAID_ACCESS           read_only (default) | starter: what happens after the 7-day grace
// GROWTH_OS_AI_MONTHLY_CAP          AI requests per workspace per month on Scale (default 500)
// GROWTH_OS_ENTITLEMENTS_DISABLED   true = no gates (instance admin / dev escape hatch)

import { readFileSync, statSync } from 'node:fs';

import { GROWTH_OS_DEFAULT_AI_MONTHLY_CAP } from 'src/engine/core-modules/growth-os/growth-os-plan.constants';

const env = (key: string) => {
  const value = process.env[key];

  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;
};

const SECRET_CACHE_MS = 30_000;
let secretCache: { key: string; at: number; value: string | undefined } | null = null;
let warnedLooseMode = false;

// Module secret: from a file (MODULE_CRM_WEBHOOK_SECRET_FILE) or from env. The value is
// never logged; a file readable by group/other only triggers a warning (path, not value).
export const readGrowthOsBillingSecret = (): string | undefined => {
  const file =
    env('MODULE_CRM_WEBHOOK_SECRET_FILE') ?? env('GROWTH_OS_BILLING_SECRET_FILE');
  const direct =
    env('MODULE_CRM_WEBHOOK_SECRET') ??
    env('GROWTH_OS_BILLING_WEBHOOK_SECRET') ??
    env('GROWTH_OS_BILLING_SECRET');
  const key = `${file ?? ''}|${direct ? 'env' : ''}`;

  if (secretCache && secretCache.key === key && Date.now() - secretCache.at < SECRET_CACHE_MS) {
    return secretCache.value;
  }

  let value: string | undefined;

  if (file) {
    try {
      const mode = statSync(file).mode & 0o777;

      if ((mode & 0o077) !== 0 && !warnedLooseMode) {
        warnedLooseMode = true;
        console.warn(`[growth-os] ${file} is readable by group/other (mode ${mode.toString(8)}); expected 600`);
      }
      value = readFileSync(file, 'utf8').trim() || undefined;
    } catch {
      value = undefined; // fail closed: a configured but unreadable file never falls back to env
    }
  } else {
    value = direct;
  }

  secretCache = { key, at: Date.now(), value };

  return value;
};

export const resetGrowthOsBillingSecretCache = () => {
  secretCache = null;
  warnedLooseMode = false;
};

export const getGrowthOsConfig = () => ({
  webhookSecret: readGrowthOsBillingSecret(),
  billingProvider:
    env('BILLING_PROVIDER') === 'growth-os'
      ? ('growth-os' as const)
      : ('mock' as const),
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

// Growth OS CRM: every server-side plan block (limits, read-only) carries a
// message that ends in "Settings → Plan & Billing". The Apollo error link
// emits it here so the app can always show it, even where the upstream UI
// swallows the error (optimistic writes, inline cell edits).
export const GROWTH_OS_PLAN_LIMIT_EVENT = 'growth-os-plan-limit';
export const GROWTH_OS_PLAN_LIMIT_DEDUPE_KEY = 'growth-os-plan-limit';

export const isGrowthOsPlanLimitMessage = (message: unknown): message is string =>
  typeof message === 'string' && message.includes('Plan & Billing');

export const emitGrowthOsPlanLimit = (message: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<string>(GROWTH_OS_PLAN_LIMIT_EVENT, { detail: message }),
  );
};

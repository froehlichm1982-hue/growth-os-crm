import {
  GROWTH_OS_GRACE_DAYS,
  GROWTH_OS_PLAN_DEFINITIONS,
  GROWTH_OS_TRIAL_DAYS,
  GROWTH_OS_TRIAL_PLAN,
  type GrowthOsBillingInterval,
  type GrowthOsBillingStatus,
  type GrowthOsEffectiveStatus,
  type GrowthOsFeature,
  type GrowthOsPlan,
} from 'src/engine/core-modules/growth-os/growth-os-plan.constants';

const DAY_MS = 24 * 60 * 60 * 1000;

// Row as stored in core."growthOsPlanEntitlement" (null = never billed).
export type GrowthOsStoredEntitlement = {
  workspaceId: string;
  plan: GrowthOsPlan;
  status: GrowthOsBillingStatus;
  seats: number | null;
  interval: GrowthOsBillingInterval | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  statusChangedAt: Date | null;
  featureOverrides: Partial<Record<GrowthOsFeature, boolean>> | null;
  aiMonthlyCap: number | null;
  aiUsageCount: number;
  aiUsagePeriod: string | null;
  // From growth-os-billing (null = not sent: the CRM's own grace clock decides).
  readOnly?: boolean | null;
  graceUntil?: Date | null;
  lookupKey?: string | null;
  cancelAtPeriodEnd?: boolean | null;
};

export type GrowthOsEffectiveEntitlement = {
  workspaceId: string;
  // plan the customer subscribed to (or trial plan)
  plan: GrowthOsPlan;
  // plan whose limits apply right now
  effectivePlan: GrowthOsPlan;
  status: GrowthOsEffectiveStatus;
  isTrial: boolean;
  trialEndsAt: Date | null;
  trialDaysLeft: number | null;
  graceEndsAt: Date | null;
  isReadOnly: boolean;
  cancelAtPeriodEnd: boolean;
  hasSubscription: boolean;
  interval: GrowthOsBillingInterval | null;
  currentPeriodEnd: Date | null;
  seatsPurchased: number | null;
  seatsAllowed: number | null;
  maxPipelines: number | null;
  maxCustomFieldsPerObject: number | null;
  apiRequestsPerMinute: number;
  aiMonthlyCap: number;
  features: Record<GrowthOsFeature, boolean>;
};

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

export const computeEffectiveEntitlement = ({
  workspaceId,
  stored,
  workspaceCreatedAt,
  now,
  unpaidAccess,
  aiMonthlyCap,
}: {
  workspaceId: string;
  stored: GrowthOsStoredEntitlement | null;
  workspaceCreatedAt: Date;
  now: Date;
  unpaidAccess: 'read_only' | 'starter';
  aiMonthlyCap: number;
}): GrowthOsEffectiveEntitlement => {
  let plan: GrowthOsPlan = stored?.plan ?? GROWTH_OS_TRIAL_PLAN;
  let effectivePlan: GrowthOsPlan;
  let status: GrowthOsEffectiveStatus;
  let trialEndsAt: Date | null = null;
  let graceEndsAt: Date | null = null;

  const isTrialRecord = !stored || stored.status === 'trialing';

  if (isTrialRecord) {
    // A brand-new workspace starts in a Growth trial without any billing call.
    trialEndsAt =
      stored?.trialEndsAt ?? addDays(workspaceCreatedAt, GROWTH_OS_TRIAL_DAYS);
    plan = stored?.plan ?? GROWTH_OS_TRIAL_PLAN;

    if (now < trialEndsAt) {
      status = 'trialing';
      effectivePlan = plan;
    } else {
      // Missing entitlement after the trial = Starter (safe default).
      status = 'trial_expired';
      effectivePlan = 'starter';
      graceEndsAt = addDays(trialEndsAt, GROWTH_OS_GRACE_DAYS);
    }
  } else if (stored.status === 'active') {
    status = 'active';
    effectivePlan = stored.plan;
  } else if (stored.status === 'past_due') {
    // Keep the paid plan for a 7-day grace, then read-only.
    status = 'past_due';
    effectivePlan = stored.plan;
    graceEndsAt = addDays(stored.statusChangedAt ?? now, GROWTH_OS_GRACE_DAYS);
  } else {
    // canceled / unpaid: pause paid features (nothing is deleted).
    status = stored.status;
    effectivePlan = 'starter';
    const lapseDate =
      stored.currentPeriodEnd && stored.currentPeriodEnd < now
        ? stored.currentPeriodEnd
        : (stored.statusChangedAt ?? now);

    graceEndsAt = addDays(lapseDate, GROWTH_OS_GRACE_DAYS);
  }

  // The billing service knows the dunning clock: its grace date and readOnly
  // flag win over the local 7-day clock whenever they were sent.
  if (stored?.graceUntil && !isTrialRecord) {
    graceEndsAt = new Date(stored.graceUntil);
  }

  const isPastGrace = graceEndsAt !== null && now >= graceEndsAt;
  const localReadOnly =
    isPastGrace && (status === 'past_due' || unpaidAccess === 'read_only');
  const isReadOnly =
    stored && !isTrialRecord && typeof stored.readOnly === 'boolean'
      ? stored.readOnly
      : localReadOnly;

  const definition = GROWTH_OS_PLAN_DEFINITIONS[effectivePlan];
  // The service keeps the remaining no-card trial days when a plan is bought with more than
  // ~2 days left: status stays `trialing` but a subscription (lookupKey) exists. The purchased
  // seats and features apply from then on; billing starts when the trial ends.
  const hasSubscription =
    stored?.status === 'trialing' && !!stored.lookupKey && status === 'trialing';
  const isPaying =
    status === 'active' || status === 'past_due' || hasSubscription;
  const seatsPurchased = isPaying ? (stored?.seats ?? null) : null;

  const seatsAllowed =
    definition.maxSeats === null
      ? seatsPurchased
      : seatsPurchased === null
        ? definition.maxSeats
        : Math.min(definition.maxSeats, seatsPurchased);

  const features = {
    ...definition.features,
    ...(isPaying ? (stored?.featureOverrides ?? {}) : {}),
  };

  return {
    workspaceId,
    plan,
    effectivePlan,
    status,
    isTrial: status === 'trialing',
    trialEndsAt,
    trialDaysLeft:
      status === 'trialing' && trialEndsAt
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS))
        : null,
    graceEndsAt,
    isReadOnly,
    cancelAtPeriodEnd: stored?.cancelAtPeriodEnd === true,
    hasSubscription,
    interval: stored?.interval ?? null,
    currentPeriodEnd: stored?.currentPeriodEnd ?? null,
    seatsPurchased,
    seatsAllowed,
    maxPipelines: definition.maxPipelines,
    maxCustomFieldsPerObject: definition.maxCustomFieldsPerObject,
    apiRequestsPerMinute: features.api ? definition.apiRequestsPerMinute : 0,
    aiMonthlyCap: features.ai ? (stored?.aiMonthlyCap ?? aiMonthlyCap) : 0,
    features,
  };
};

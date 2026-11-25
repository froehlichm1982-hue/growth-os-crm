// Growth OS CRM plan matrix (AGPL; enforced in this fork, sold by growth-os-billing).
// Source of truth: proposal-growth-os-crm.md §3 and brief 04. Net EUR prices,
// yearly = 10 × monthly. Stripe prices are created in growth-os-billing, never here.

import { GROWTH_OS_PRICING } from 'twenty-shared/i18n';

const price = (plan: string) => {
  const entry = GROWTH_OS_PRICING.plans.find((item) => item.plan === plan);

  if (!entry) throw new Error(`Missing Growth OS price for ${plan}`);

  return {
    priceMonthlyEur: entry.priceMonthlyEur,
    priceYearlyEur: entry.priceYearlyEur,
  };
};

export const GROWTH_OS_PLANS_ORDER = ['starter', 'growth', 'scale'] as const;

export type GrowthOsPlan = (typeof GROWTH_OS_PLANS_ORDER)[number];

export type GrowthOsBillingInterval = 'month' | 'year';

export type GrowthOsBillingStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export type GrowthOsEffectiveStatus =
  | 'trialing'
  | 'trial_expired'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export const GROWTH_OS_FEATURES = [
  'emailCalendarSync',
  'workflows',
  'customObjects',
  'customRoles',
  'api',
  'ai',
] as const;

export type GrowthOsFeature = (typeof GROWTH_OS_FEATURES)[number];

export type GrowthOsPlanDefinition = {
  label: string;
  priceMonthlyEur: number;
  priceYearlyEur: number;
  // null = unlimited
  maxSeats: number | null;
  maxPipelines: number | null;
  maxCustomFieldsPerObject: number | null;
  // API-key requests per minute (0 = no API access)
  apiRequestsPerMinute: number;
  features: Record<GrowthOsFeature, boolean>;
};

export const GROWTH_OS_PLAN_DEFINITIONS: Record<
  GrowthOsPlan,
  GrowthOsPlanDefinition
> = {
  starter: {
    label: 'Starter',
    ...price('starter'),
    maxSeats: 3,
    maxPipelines: 1,
    maxCustomFieldsPerObject: 10,
    apiRequestsPerMinute: 0,
    features: {
      emailCalendarSync: false,
      workflows: false,
      customObjects: false,
      customRoles: false,
      api: false,
      ai: false,
    },
  },
  growth: {
    label: 'Growth',
    ...price('growth'),
    maxSeats: 25,
    maxPipelines: null,
    maxCustomFieldsPerObject: null,
    apiRequestsPerMinute: 100,
    features: {
      emailCalendarSync: true,
      workflows: true,
      customObjects: true,
      customRoles: true,
      api: true,
      ai: false,
    },
  },
  scale: {
    label: 'Scale',
    ...price('scale'),
    maxSeats: null,
    maxPipelines: null,
    maxCustomFieldsPerObject: null,
    apiRequestsPerMinute: 300,
    features: {
      emailCalendarSync: true,
      workflows: true,
      customObjects: true,
      customRoles: true,
      api: true,
      ai: true,
    },
  },
};

export const GROWTH_OS_FEATURE_LABELS: Record<GrowthOsFeature, string> = {
  emailCalendarSync: 'Email & calendar sync',
  workflows: 'Workflows',
  customObjects: 'Custom objects',
  customRoles: 'Custom roles',
  api: 'API & webhooks',
  ai: 'AI',
};

// Lowest plan that unlocks a feature (used in upgrade prompts).
export const GROWTH_OS_FEATURE_MIN_PLAN: Record<GrowthOsFeature, GrowthOsPlan> =
  {
    emailCalendarSync: 'growth',
    workflows: 'growth',
    customObjects: 'growth',
    customRoles: 'growth',
    api: 'growth',
    ai: 'scale',
  };

export const GROWTH_OS_TRIAL_PLAN: GrowthOsPlan = 'growth';
export const GROWTH_OS_TRIAL_DAYS = 14;
export const GROWTH_OS_GRACE_DAYS = 7;
export const GROWTH_OS_DEFAULT_AI_MONTHLY_CAP = 500;
export const GROWTH_OS_WEBHOOK_TOLERANCE_SECONDS = 300;
export const GROWTH_OS_SIGNATURE_HEADER = 'x-growth-os-signature';

export const getGrowthOsLookupKey = (
  plan: GrowthOsPlan,
  interval: GrowthOsBillingInterval,
) => `crm_${plan}_${interval === 'year' ? 'y' : 'm'}`;

export const isGrowthOsPlan = (value: unknown): value is GrowthOsPlan =>
  typeof value === 'string' &&
  (GROWTH_OS_PLANS_ORDER as readonly string[]).includes(value);

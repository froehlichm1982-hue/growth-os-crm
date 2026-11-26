import { gql } from '@apollo/client';

export const GROWTH_OS_PLAN_QUERY = gql`
  query GrowthOsPlan {
    growthOsPlan {
      plan
      effectivePlan
      status
      isTrial
      trialEndsAt
      trialDaysLeft
      graceEndsAt
      isReadOnly
      interval
      currentPeriodEnd
      seatsAllowed
      seatsUsed
      pendingInvitations
      pipelines
      maxPipelines
      maxCustomFieldsPerObject
      apiRequestsPerMinute
      aiMonthlyCap
      features
      catalog
    }
  }
`;

export const GROWTH_OS_BILLING_SESSION_MUTATION = gql`
  mutation GrowthOsBillingSessionUrl(
    $kind: String!
    $plan: String
    $interval: String
    $returnUrl: String
    $reason: String
  ) {
    growthOsBillingSessionUrl(
      kind: $kind
      plan: $plan
      interval: $interval
      returnUrl: $returnUrl
      reason: $reason
    )
  }
`;

export type GrowthOsPlanName = 'starter' | 'growth' | 'scale';

export type GrowthOsPlanData = {
  plan: GrowthOsPlanName;
  effectivePlan: GrowthOsPlanName;
  status:
    | 'trialing'
    | 'trial_expired'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid';
  isTrial: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  graceEndsAt: string | null;
  isReadOnly: boolean;
  interval: 'month' | 'year' | null;
  currentPeriodEnd: string | null;
  seatsAllowed: number | null;
  seatsUsed: number;
  pendingInvitations: number;
  pipelines: number;
  maxPipelines: number | null;
  maxCustomFieldsPerObject: number | null;
  apiRequestsPerMinute: number;
  aiMonthlyCap: number;
  features: Record<string, boolean>;
  catalog: {
    currency: string;
    taxNote: string;
    trialDays: number;
    graceDays: number;
    featureLabels: Record<string, string>;
    plans: Array<{
      plan: GrowthOsPlanName;
      label: string;
      priceMonthlyEur: number;
      priceYearlyEur: number;
      lookupKeys: { month: string; year: string };
      maxSeats: number | null;
      maxPipelines: number | null;
      maxCustomFieldsPerObject: number | null;
      apiRequestsPerMinute: number;
      features: Record<string, boolean>;
    }>;
  };
};

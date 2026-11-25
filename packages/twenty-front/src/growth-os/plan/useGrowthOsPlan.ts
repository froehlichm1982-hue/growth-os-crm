import { useQuery } from '@apollo/client/react';

import {
  GROWTH_OS_PLAN_QUERY,
  type GrowthOsPlanData,
} from '~/growth-os/plan/growthOsPlanGraphql';

export const useGrowthOsPlan = ({ skip = false }: { skip?: boolean } = {}) => {
  const { data, loading, refetch } = useQuery<{
    growthOsPlan: GrowthOsPlanData;
  }>(GROWTH_OS_PLAN_QUERY, {
    skip,
    fetchPolicy: 'cache-and-network',
  });

  return { plan: data?.growthOsPlan, loading, refetch };
};

export const GROWTH_OS_PLAN_LABELS = {
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
} as const;

export const formatGrowthOsDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

export const getGrowthOsStatusLine = (plan: GrowthOsPlanData) => {
  const label = GROWTH_OS_PLAN_LABELS[plan.plan];

  switch (plan.status) {
    case 'trialing':
      return `${label} trial · ${plan.trialDaysLeft} day${plan.trialDaysLeft === 1 ? '' : 's'} left`;
    case 'trial_expired':
      return plan.isReadOnly
        ? 'Trial ended · read-only'
        : `Trial ended · Starter limits until ${formatGrowthOsDate(plan.graceEndsAt)}`;
    case 'active':
      return `${label} plan`;
    case 'past_due':
      return plan.isReadOnly
        ? 'Payment failed · read-only'
        : `Payment failed · fix by ${formatGrowthOsDate(plan.graceEndsAt)}`;
    default:
      return plan.isReadOnly
        ? 'No active plan · read-only'
        : `Plan ended · Starter limits until ${formatGrowthOsDate(plan.graceEndsAt)}`;
  }
};

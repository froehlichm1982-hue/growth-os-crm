import { useQuery } from '@apollo/client/react';
import { i18n } from '@lingui/core';
import { t } from '@lingui/core/macro';

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
    ? new Date(iso).toLocaleDateString(i18n.locale?.startsWith('de') ? 'de-DE' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

export const getGrowthOsStatusLine = (plan: GrowthOsPlanData) => {
  const label = GROWTH_OS_PLAN_LABELS[plan.plan];

  switch (plan.status) {
    case 'trialing':
      return plan.trialDaysLeft === 1
        ? t`${label} trial · 1 day left`
        : t`${label} trial · ${plan.trialDaysLeft ?? 0} days left`;
    case 'trial_expired':
      return plan.isReadOnly
        ? t`Trial ended · read-only`
        : t`Trial ended · Starter limits until ${formatGrowthOsDate(plan.graceEndsAt)}`;
    case 'active':
      return t`${label} plan`;
    case 'past_due':
      return plan.isReadOnly
        ? t`Payment failed · read-only`
        : t`Payment failed · fix by ${formatGrowthOsDate(plan.graceEndsAt)}`;
    default:
      return plan.isReadOnly
        ? t`No active plan · read-only`
        : t`Plan ended · Starter limits until ${formatGrowthOsDate(plan.graceEndsAt)}`;
  }
};

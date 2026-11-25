import { useMutation } from '@apollo/client/react';
import { t } from '@lingui/core/macro';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import {
  GROWTH_OS_BILLING_SESSION_MUTATION,
  type GrowthOsPlanName,
} from '~/growth-os/plan/growthOsPlanGraphql';

export type GrowthOsBillingSessionKind = 'checkout' | 'portal' | 'cancel';

// Opens a billing session URL from growth-os-billing (the CRM never talks to
// Stripe). Returns true when a window was opened.
export const useGrowthOsBillingSession = () => {
  const [requestSession, { loading }] = useMutation<{
    growthOsBillingSessionUrl: string;
  }>(GROWTH_OS_BILLING_SESSION_MUTATION);
  const { enqueueErrorSnackBar } = useSnackBar();

  const openSession = async ({
    kind,
    plan,
    interval,
    reason,
  }: {
    kind: GrowthOsBillingSessionKind;
    plan?: GrowthOsPlanName;
    interval?: 'month' | 'year';
    reason?: string;
  }) => {
    try {
      const result = await requestSession({
        variables: {
          kind,
          plan,
          interval,
          reason,
          returnUrl: window.location.href,
        },
      });
      const url = result.data?.growthOsBillingSessionUrl;

      if (!url) return false;
      window.open(url, '_blank', 'noopener,noreferrer');

      return true;
    } catch {
      enqueueErrorSnackBar({
        message: t`Couldn’t open billing. Try again in a moment.`,
      });

      return false;
    }
  };

  return { openSession, loading };
};

export const growthOsDaysUntil = (iso: string | null, now = Date.now()) =>
  iso === null
    ? null
    : Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));

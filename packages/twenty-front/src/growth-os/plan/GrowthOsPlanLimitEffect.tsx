import { useEffect } from 'react';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import {
  GROWTH_OS_PLAN_LIMIT_DEDUPE_KEY,
  GROWTH_OS_PLAN_LIMIT_EVENT,
} from '~/growth-os/plan/growthOsPlanLimitEvents';

// Shows one warning per blocked write with a direct link to Plan & Billing.
export const GrowthOsPlanLimitEffect = () => {
  const { enqueueWarningSnackBar } = useSnackBar();

  useEffect(() => {
    const handler = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;

      enqueueWarningSnackBar({
        message,
        options: {
          dedupeKey: GROWTH_OS_PLAN_LIMIT_DEDUPE_KEY,
          buttonLabel: 'See plans',
          buttonTo: getSettingsPath(SettingsPath.Billing),
          duration: 8000,
        },
      });
    };

    window.addEventListener(GROWTH_OS_PLAN_LIMIT_EVENT, handler);

    return () => window.removeEventListener(GROWTH_OS_PLAN_LIMIT_EVENT, handler);
  }, [enqueueWarningSnackBar]);

  return null;
};

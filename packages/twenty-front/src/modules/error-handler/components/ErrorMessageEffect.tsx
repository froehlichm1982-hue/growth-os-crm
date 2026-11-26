import { useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { growthOsAuthAlertState } from '~/growth-os/auth/growthOsAuthAlertState';
import {
  GROWTH_OS_OAUTH_PROVIDER_KEY,
  growthOsTake,
} from '~/growth-os/session/growthOsSessionExpiredState';

export const ErrorMessageEffect = () => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar } = useSnackBar();
  const setGrowthOsAuthAlert = useSetAtomState(growthOsAuthAlertState);
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const errorMessage = searchParams.get('errorMessage');

  useEffect(() => {
    if (isDefined(errorMessage)) {
      // Growth OS (§4 OAuth return): back on sign-in, an error is an alert in
      // the card that names the provider and offers email, not a raw toast.
      if (pathname === AppPath.SignInUp || pathname === '/') {
        const provider =
          searchParams.get('provider') ??
          growthOsTake(GROWTH_OS_OAUTH_PROVIDER_KEY);

        setGrowthOsAuthAlert({
          tone: 'danger',
          kind: 'oauth',
          message:
            provider === 'google'
              ? t`Google sign-in didn’t finish. Try again or continue with email.`
              : provider === 'microsoft'
                ? t`Microsoft sign-in didn’t finish. Try again or continue with email.`
                : t`That sign-in didn’t finish. Try again or continue with email.`,
        });
      } else {
        enqueueErrorSnackBar({
          message: errorMessage,
          options: {
            dedupeKey: 'error-message-dedupe-key',
          },
        });
      }
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('errorMessage');
      newSearchParams.delete('provider');
      setSearchParams(newSearchParams);
    }
  }, [
    enqueueErrorSnackBar,
    errorMessage,
    pathname,
    searchParams,
    setGrowthOsAuthAlert,
    setSearchParams,
    t,
  ]);

  return <></>;
};

import { useCallback } from 'react';

import { currentUserState } from '@/auth/states/currentUserState';
import { workspacePublicDataState } from '@/auth/states/workspacePublicDataState';
import { useReadCaptchaToken } from '@/captcha/hooks/useReadCaptchaToken';
import { useCaptcha } from '@/client-config/hooks/useCaptcha';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useLingui } from '@lingui/react/macro';
import { useMutation } from '@apollo/client/react';
import { EmailPasswordResetLinkDocument } from '~/generated-metadata/graphql';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { isDefined } from 'twenty-shared/utils';
import { growthOsResetSentState } from '~/growth-os/auth/growthOsAuthAlertState';

export const useHandleResetPassword = () => {
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [emailPasswordResetLink] = useMutation(EmailPasswordResetLinkDocument);
  const workspacePublicData = useAtomStateValue(workspacePublicDataState);
  const currentUser = useAtomStateValue(currentUserState);
  const { isCaptchaReady } = useCaptcha();
  const { readCaptchaToken } = useReadCaptchaToken();

  const { t } = useLingui();
  const setGrowthOsResetSent = useSetAtomState(growthOsResetSentState);

  const handleResetPassword = useCallback(
    (email = currentUser?.email) => {
      return async () => {
        if (!email) {
          enqueueErrorSnackBar({
            message: t`Invalid email`,
          });
          return;
        }

        if (!isCaptchaReady) {
          enqueueErrorSnackBar({
            message: t`Captcha (anti-bot check) is still loading, try again`,
          });
          return;
        }

        const captchaToken = readCaptchaToken();

        try {
          const { data } = await emailPasswordResetLink({
            variables: workspacePublicData?.id
              ? { email, workspaceId: workspacePublicData.id, captchaToken }
              : { email, captchaToken },
          });

          if (data?.emailPasswordResetLink?.success === true) {
            // Growth OS: the sign-in card shows the kit "reset sent" panel
            // with a resend cooldown; signed-in settings keep the toast.
            setGrowthOsResetSent((previous) => ({
              email,
              sentAt: Date.now(),
              sends: previous?.email === email ? previous.sends + 1 : 1,
            }));
            if (isDefined(currentUser)) {
              enqueueSuccessSnackBar({
                message: t`We’ve sent a reset link to ${email}. It works for 60 minutes.`,
              });
            }
          } else {
            enqueueErrorSnackBar({});
          }
        } catch (error) {
          enqueueErrorSnackBar(
            CombinedGraphQLErrors.is(error)
              ? { apolloError: error }
              : { message: error instanceof Error ? error.message : undefined },
          );
        }
      };
    },
    [
      currentUser?.email,
      workspacePublicData?.id,
      enqueueErrorSnackBar,
      enqueueSuccessSnackBar,
      t,
      emailPasswordResetLink,
      isCaptchaReady,
      readCaptchaToken,
      setGrowthOsResetSent,
    ],
  );

  return { handleResetPassword };
};

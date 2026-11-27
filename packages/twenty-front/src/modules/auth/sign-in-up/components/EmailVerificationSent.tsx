import { Trans, useLingui } from '@lingui/react/macro';

import { useHandleResendEmailVerificationToken } from '@/auth/sign-in-up/hooks/useHandleResendEmailVerificationToken';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { GrowthOsStateIcon } from '~/growth-os/auth/GrowthOsResetSent';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';

const GosArrowLeft = createGosIcon('arrow-left', 'GosVerifyBack');

// Growth OS CRM: kit "verify your email" card (same pattern as reset-sent).
export const EmailVerificationSent = ({
  email,
  isError = false,
}: {
  email: string | null;
  isError?: boolean;
}) => {
  const { t } = useLingui();
  const setSignInUpStep = useSetAtomState(signInUpStepState);

  const { handleResendEmailVerificationToken, loading: isLoading } =
    useHandleResendEmailVerificationToken();

  const handleChangeEmail = () => {
    setSignInUpStep(SignInUpStep.Email);
  };

  const address = email ?? '';

  if (isError) {
    return (
      <div className="gos-auth-status" data-testid="growth-os-verify-error">
        <GrowthOsStateIcon kind="clock" tone="warn" />
        <div className="head">
          <h1>{t`This link has expired`}</h1>
          <p className="sub">
            {t`Verification links work once, for 30 minutes. Request a new one, it takes a few seconds.`}
          </p>
        </div>
        <button
          type="button"
          className="gos-btn gos-btn--primary gos-btn--block gos-btn--lg"
          onClick={handleResendEmailVerificationToken(email)}
          disabled={isLoading}
        >
          {isLoading ? t`Sending…` : t`Send a new link`}
        </button>
        <button
          type="button"
          className="gos-link gos-tap gos-back growth-os-linklike"
          onClick={handleChangeEmail}
        >
          <GosArrowLeft className="gos-icon sm" />
          {t`Use a different email`}
        </button>
      </div>
    );
  }

  return (
    <div className="gos-auth-status" data-testid="growth-os-verify-sent">
      <GrowthOsStateIcon kind="mail" />
      <div className="head">
        <h1>{t`Check your inbox`}</h1>
        <p className="sub">
          <Trans>We sent a verification link to <b>{address}</b>. It works once, for 30 minutes.</Trans>
        </p>
      </div>
      <button
        type="button"
        className="gos-btn gos-btn--secondary gos-btn--block gos-btn--lg"
        onClick={handleResendEmailVerificationToken(email)}
        disabled={isLoading}
      >
        {isLoading ? t`Sending…` : t`Resend link`}
      </button>
      <p className="gos-small gos-muted" role="status">
        {t`No email? Check your spam folder.`}
      </p>
      <button type="button" className="gos-link gos-tap gos-back growth-os-linklike" onClick={handleChangeEmail}>
        <GosArrowLeft className="gos-icon sm" />
        {t`Use a different email`}
      </button>
    </div>
  );
};

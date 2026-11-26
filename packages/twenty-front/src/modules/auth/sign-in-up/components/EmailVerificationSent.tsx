import { useLingui } from '@lingui/react/macro';

import { useHandleResendEmailVerificationToken } from '@/auth/sign-in-up/hooks/useHandleResendEmailVerificationToken';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import '~/growth-os/auth/growth-os-auth-fields.css';
import { GrowthOsStateIcon } from '~/growth-os/auth/GrowthOsResetSent';

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
      <div className="gos-flow" data-testid="growth-os-verify-error">
        <GrowthOsStateIcon kind="clock" tone="danger" />
        <h1 className="gos-auth-title">{t`This link has expired`}</h1>
        <p className="gos-auth-sub">
          {t`We couldn’t confirm your email with this link. Send a new one and use the latest email.`}
        </p>
        <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
          <button
            type="button"
            className="gos-btn gos-btn-primary gos-btn-block"
            onClick={handleResendEmailVerificationToken(email)}
            disabled={isLoading}
          >
            {isLoading ? t`Sending…` : t`Send a new link`}
          </button>
          <button
            type="button"
            className="gos-btn gos-btn-secondary gos-btn-block"
            onClick={handleChangeEmail}
          >
            {t`Use a different email`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gos-flow" data-testid="growth-os-verify-sent">
      <GrowthOsStateIcon kind="mail" />
      <h1 className="gos-auth-title">{t`Confirm your email`}</h1>
      <p className="gos-auth-sub">
        {t`We sent a confirmation link to ${address}. Open it to activate your workspace.`}
      </p>
      <ol className="gos-steps">
        <li><span>1</span>{t`Open the email from ScalePoint Growth OS`}</li>
        <li><span>2</span>{t`Click “Confirm email”`}</li>
        <li><span>3</span>{t`Not there after a minute? Check spam or promotions`}</li>
      </ol>
      <button
        type="button"
        className="gos-btn gos-btn-secondary gos-btn-block"
        onClick={handleResendEmailVerificationToken(email)}
        disabled={isLoading}
      >
        {isLoading ? t`Sending…` : t`Resend email`}
      </button>
      <div className="gos-meta-row">
        <span aria-live="polite">{isLoading ? t`Sending…` : ''}</span>
        <button type="button" className="gos-linklike" onClick={handleChangeEmail}>
          {t`Use a different email`}
        </button>
      </div>
    </div>
  );
};

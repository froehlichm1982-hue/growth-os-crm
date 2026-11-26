import { useAuth } from '@/auth/hooks/useAuth';
import { useIsLogged } from '@/auth/hooks/useIsLogged';
import { useHandleResetPassword } from '@/auth/sign-in-up/hooks/useHandleResetPassword';
import { currentUserState } from '@/auth/states/currentUserState';
import { useReadCaptchaToken } from '@/captcha/hooks/useReadCaptchaToken';
import { useCaptcha } from '@/client-config/hooks/useCaptcha';
import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import { useRedirect } from '@/domain-manager/hooks/useRedirect';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import {
  UpdatePasswordViaResetTokenDocument,
  ValidatePasswordResetTokenDocument,
} from '~/generated-metadata/graphql';
import { GrowthOsEmailInput, GrowthOsPasswordInput } from '~/growth-os/auth/GrowthOsAuthFields';
import { growthOsResetSentState } from '~/growth-os/auth/growthOsAuthAlertState';
import { growthOsPasswordError } from '~/growth-os/auth/growthOsPasswordRules';
import { GrowthOsResetSentCard, GrowthOsStateIcon } from '~/growth-os/auth/GrowthOsResetSent';
import { GROWTH_OS_BRAND } from '~/growth-os/brand';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import { getErrorMessageFromApolloError } from '~/utils/get-error-message-from-apollo-error.util';
import { logError } from '~/utils/logError';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';

const GosLogOutIcon = createGosIcon('log-out', 'GosResetSignOut');

// Growth OS: kit reset flow (reset-new.html / expired.html) inside the auth
// shell. Invalid or used links get the expired state with a way forward
// instead of a toast and a redirect.
const ExpiredLink = () => {
  const { t } = useLingui();
  const { handleResetPassword } = useHandleResetPassword();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t`Enter an email like name@company.com.`);
      return;
    }
    setError(null);
    setIsSending(true);
    await handleResetPassword(trimmed)();
    setIsSending(false);
  };

  return (
    <div className="gos-flow" data-testid="growth-os-reset-expired">
      <GrowthOsStateIcon tone="danger" kind="clock" />
      <h1 className="gos-auth-title">{t`This link has expired`}</h1>
      <p className="gos-auth-sub">
        {t`Reset links work for 60 minutes and only once. Request a new one and we’ll send it straight away.`}
      </p>
      <form onSubmit={onSubmit} noValidate>
        <GrowthOsEmailInput value={email} onChange={setEmail} error={error} autoFocus />
        <button className="gos-btn gos-btn-primary gos-btn-block" type="submit" disabled={isSending} aria-busy={isSending || undefined}>
          {isSending && <span className="gos-spinner" aria-hidden="true" />}
          {isSending ? t`Sending link…` : t`Send a new link`}
        </button>
      </form>
      <p className="gos-legal-line">
        {t`Still stuck? Write to`}{' '}
        <a href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}>{GROWTH_OS_BRAND.supportEmail}</a>.
      </p>
    </div>
  );
};

const LoadingCard = () => (
  <div className="gos-flow" aria-busy="true" aria-live="polite">
    <div className="gos-skel" style={{ height: 34, width: '70%' }} />
    <div className="gos-skel" style={{ height: 16, width: '90%', marginTop: 12 }} />
    <div className="gos-skel" style={{ height: 44, width: '100%', marginTop: 28 }} />
    <div className="gos-skel" style={{ height: 44, width: '100%', marginTop: 24 }} />
  </div>
);

export const PasswordReset = () => {
  const { t, i18n } = useLingui();
  const { enqueueSuccessSnackBar } = useSnackBar();
  const setCurrentUser = useSetAtomState(currentUserState);
  const [resetSent, setResetSent] = useAtomState(growthOsResetSentState);

  const navigate = useNavigateApp();
  const { redirect } = useRedirect();

  const [email, setEmail] = useState('');
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isTargetUserPasswordSet, setIsTargetUserPasswordSet] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const passwordResetToken = useParams().passwordResetToken;

  const isLogged = useIsLogged();

  // A stale "sent" card from the sign-in page must not cover this page.
  useEffect(() => {
    setResetSent(null);
  }, [setResetSent]);

  const { data: tokenValidationData, error: tokenValidationError } = useQuery(
    ValidatePasswordResetTokenDocument,
    {
      variables: { token: passwordResetToken ?? '' },
      skip: !passwordResetToken || isTokenValid,
    },
  );

  useEffect(() => {
    if (tokenValidationData) {
      setIsTokenValid(true);
      const validationResult = tokenValidationData?.validatePasswordResetToken;
      if (isNonEmptyString(validationResult?.email)) {
        setEmail(validationResult.email);
      }
      if (validationResult?.hasPassword) {
        setIsTargetUserPasswordSet(validationResult.hasPassword);
      }
    }
  }, [tokenValidationData]);

  const [updatePasswordViaToken, { loading: isUpdatingPassword }] = useMutation(
    UpdatePasswordViaResetTokenDocument,
  );

  const { signInWithCredentialsInWorkspace, signInWithCredentials } = useAuth();
  const { isOnAWorkspace } = useIsCurrentLocationOnAWorkspace();
  const { readCaptchaToken } = useReadCaptchaToken();
  const { isCaptchaReady } = useCaptcha();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = growthOsPasswordError(newPassword, email);
    if (problem) {
      setPasswordError(i18n._(problem));
      return;
    }
    setPasswordError(null);
    setFormError(null);

    try {
      const { data } = await updatePasswordViaToken({
        variables: { token: passwordResetToken ?? '', newPassword },
      });

      if (!data?.updatePasswordViaResetToken.success) {
        setFormError(t`We couldn’t save your password. Try again.`);
        return;
      }

      setCurrentUser((currentUser) =>
        currentUser ? { ...currentUser, hasPassword: true } : currentUser,
      );

      if (isLogged) {
        enqueueSuccessSnackBar({
          message: isTargetUserPasswordSet ? t`Password updated` : t`Password set`,
        });
        navigate(AppPath.Index);
        return;
      }

      if (!isCaptchaReady) {
        setFormError(t`The security check is still loading. Try again in a moment.`);
        return;
      }

      const captchaToken = readCaptchaToken();

      if (isOnAWorkspace) {
        await signInWithCredentialsInWorkspace(email || '', newPassword, captchaToken);
      } else {
        await signInWithCredentials(email || '', newPassword, captchaToken);
      }

      redirect(AppPath.Index);
    } catch (err) {
      logError(err);
      setFormError(
        err instanceof Error
          ? getErrorMessageFromApolloError(err)
          : t`Something went wrong on our side. Try again.`,
      );
    }
  };

  if (isDefined(resetSent)) {
    return <GrowthOsResetSentCard />;
  }

  if (!passwordResetToken || isDefined(tokenValidationError)) {
    return <ExpiredLink />;
  }

  if (!isTokenValid || !email) {
    return <LoadingCard />;
  }

  return (
    <div className="gos-flow" data-testid="growth-os-reset-new">
      <h1 className="gos-auth-title">
        {isTargetUserPasswordSet ? t`Choose a new password` : t`Set your password`}
      </h1>
      <p className="gos-auth-sub">
        {t`For`} <b>{email}</b>.{' '}
        {t`Use at least 8 characters. A short phrase is easy to remember and hard to guess.`}
      </p>
      {formError && (
        <div className="gos-alert gos-alert-danger" role="alert">
          <div><b>{formError}</b></div>
        </div>
      )}
      <form onSubmit={onSubmit} noValidate>
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <GrowthOsPasswordInput
          value={newPassword}
          onChange={(value) => {
            setNewPassword(value);
            if (passwordError) setPasswordError(null);
          }}
          mode="new"
          email={email}
          label={t`New password`}
          error={passwordError}
          autoFocus
        />
        {isTargetUserPasswordSet && (
          <p className="gos-form-note" data-testid="growth-os-reset-signout-note">
            <GosLogOutIcon size={14} />
            {t`You’ll be signed out on your other devices.`}
          </p>
        )}
        <button className="gos-btn gos-btn-primary gos-btn-block" type="submit" disabled={isUpdatingPassword} aria-busy={isUpdatingPassword || undefined}>
          {isUpdatingPassword && <span className="gos-spinner" aria-hidden="true" />}
          {isUpdatingPassword ? t`Saving…` : t`Save and sign in`}
        </button>
      </form>
    </div>
  );
};

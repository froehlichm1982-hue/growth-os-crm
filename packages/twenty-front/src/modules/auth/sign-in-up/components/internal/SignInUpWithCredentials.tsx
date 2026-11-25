import { useHasMultipleAuthMethods } from '@/auth/sign-in-up/hooks/useHasMultipleAuthMethods';
import { useSignInUp } from '@/auth/sign-in-up/hooks/useSignInUp';
import { type Form } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { lastAuthenticatedMethodState } from '@/auth/states/lastAuthenticatedMethodState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';

import { LastUsedPill } from '@/auth/sign-in-up/components/internal/LastUsedPill';
import { SignInUpEmailField } from '@/auth/sign-in-up/components/internal/SignInUpEmailField';
import { SignInUpPasswordField } from '@/auth/sign-in-up/components/internal/SignInUpPasswordField';
import { StyledSsoButtonContainer } from '@/auth/sign-in-up/components/internal/SignInUpSsoButtonStyles';
import { AuthenticatedMethod } from '@/auth/types/AuthenticatedMethod.enum';
import { SignInUpMode } from '@/auth/types/signInUpMode';
import { isRequestingCaptchaTokenState } from '@/captcha/states/isRequestingCaptchaTokenState';
import { captchaState } from '@/client-config/states/captchaState';
import { isDDLLockedState } from '@/client-config/states/isDDLLockedState';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { isDefined } from 'twenty-shared/utils';
import { InputHint } from 'twenty-ui/input';
import { useHandleResetPassword } from '@/auth/sign-in-up/hooks/useHandleResetPassword';
import { GrowthOsAuthAlert } from '~/growth-os/auth/GrowthOsAuthAlert';
import { growthOsAuthAlertState } from '~/growth-os/auth/growthOsAuthAlertState';
import { growthOsPasswordError } from '~/growth-os/auth/growthOsPasswordRules';
import { GROWTH_OS_BRAND } from '~/growth-os/brand';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { signInUpModeState } from '@/auth/states/signInUpModeState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const StyledForm = styled.form`
  align-items: center;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  width: 100%;
`;

export const SignInUpWithCredentials = ({
  isGlobalScope,
}: {
  isGlobalScope?: boolean;
}) => {
  const { t } = useLingui();
  const form = useFormContext<Form>();

  const [signInUpStep, setSignInUpStep] = useAtomState(signInUpStepState);
  const [showErrors, setShowErrors] = useState(false);
  const captcha = useAtomStateValue(captchaState);
  const isDDLLocked = useAtomStateValue(isDDLLockedState);
  const isRequestingCaptchaToken = useAtomStateValue(
    isRequestingCaptchaTokenState,
  );
  const lastAuthenticatedMethod = useAtomStateValue(
    lastAuthenticatedMethodState,
  );
  const hasMultipleAuthMethods = useHasMultipleAuthMethods();
  const { i18n } = useLingui();
  const { handleResetPassword } = useHandleResetPassword();
  const [growthOsAuthAlert, setGrowthOsAuthAlert] = useAtomState(growthOsAuthAlertState);
  const [passwordProblem, setPasswordProblem] = useState<string | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);

  const setSignInUpMode = useSetAtomState(signInUpModeState);
  const {
    isInviteMode,
    signInUpMode,
    continueWithEmail,
    continueWithCredentials,
    submitCredentials,
  } = useSignInUp(form);

  const isLastUsed =
    signInUpStep === SignInUpStep.Init &&
    lastAuthenticatedMethod === AuthenticatedMethod.EMAIL &&
    (isGlobalScope || hasMultipleAuthMethods);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitButtonDisabled) return;

    if (
      signInUpStep === SignInUpStep.Init ||
      signInUpStep === SignInUpStep.Email
    ) {
      // Growth OS: the email field is visible from the start (kit).
      const isEmailValid = await form.trigger('email');
      if (!isEmailValid) {
        setShowErrors(true);
        return;
      }
      if (signInUpStep === SignInUpStep.Init) continueWithEmail();
      continueWithCredentials();
    } else if (signInUpStep === SignInUpStep.Password) {
      if (!form.formState.isSubmitting) {
        setShowErrors(true);
        if (signInUpMode === SignInUpMode.SignUp) {
          const problem = growthOsPasswordError(
            form.getValues('password') ?? '',
            form.getValues('email'),
          );
          setPasswordProblem(problem ? i18n._(problem) : null);
          if (problem) return;
          if (!hasAcceptedTerms) {
            setShowTermsError(true);
            return;
          }
        }
        form.handleSubmit(submitCredentials)();
      }
    }
  };

  const onEmailChange = (email: string) => {
    if (email !== form.getValues('email')) {
      if (signInUpStep === SignInUpStep.Password) {
        setSignInUpStep(SignInUpStep.Email);
      }
      setGrowthOsAuthAlert(null);
    }
  };

  const email = form.watch('email');
  const forgotPassword = () => {
    setGrowthOsAuthAlert(null);
    handleResetPassword(form.getValues('email'))();
  };

  const buttonTitle = useMemo(() => {
    if (
      signInUpMode === SignInUpMode.SignIn &&
      signInUpStep === SignInUpStep.Password
    ) {
      return t`Sign in`;
    }

    if (
      signInUpMode === SignInUpMode.SignUp &&
      signInUpStep === SignInUpStep.Password
    ) {
      return t`Create account`;
    }

    return t`Continue`;
  }, [signInUpMode, signInUpStep, t]);

  const shouldWaitForCaptchaToken =
    signInUpStep !== SignInUpStep.Init &&
    isDefined(captcha?.provider) &&
    isRequestingCaptchaToken;

  const isEmailStepSubmitButtonDisabledCondition =
    signInUpStep === SignInUpStep.Email &&
    (isDefined(form.formState.errors['email']) || shouldWaitForCaptchaToken);

  // TODO: isValid is actually a proxy function. If it is not rendered the first time, react might not trigger re-renders
  // We make the isValid check synchronous and update a reactState to make sure this does not happen
  const isPasswordStepSubmitButtonDisabledCondition =
    signInUpStep === SignInUpStep.Password &&
    (!form.formState.isValid ||
      form.formState.isSubmitting ||
      shouldWaitForCaptchaToken);

  const isSignUpBlockedByDDLLock =
    isDDLLocked &&
    signInUpMode === SignInUpMode.SignUp &&
    signInUpStep === SignInUpStep.Password;

  const isSubmitButtonDisabled =
    isEmailStepSubmitButtonDisabledCondition ||
    isPasswordStepSubmitButtonDisabledCondition ||
    isSignUpBlockedByDDLLock ||
    isDefined(growthOsAuthAlert?.lockedUntil);

  return (
    <>
      {(signInUpStep === SignInUpStep.Password ||
        signInUpStep === SignInUpStep.Email ||
        signInUpStep === SignInUpStep.Init) && (
        <StyledForm onSubmit={handleSubmit} noValidate>
          <GrowthOsAuthAlert onResetPassword={forgotPassword} />
          <SignInUpEmailField
            showErrors={showErrors}
            onInputChange={onEmailChange}
            autoFocus={signInUpStep !== SignInUpStep.Password}
          />
          {signInUpStep === SignInUpStep.Password && (
            <SignInUpPasswordField
              showErrors={showErrors}
              signInUpMode={signInUpMode}
              onForgotPassword={email ? forgotPassword : undefined}
              extraError={passwordProblem}
            />
          )}
          {signInUpStep === SignInUpStep.Password &&
            signInUpMode === SignInUpMode.SignUp && (
              <div className="gos-field">
                <label className="gos-check">
                  <input
                    type="checkbox"
                    checked={hasAcceptedTerms}
                    aria-invalid={showTermsError && !hasAcceptedTerms ? true : undefined}
                    onChange={(event) => {
                      setHasAcceptedTerms(event.target.checked);
                      setShowTermsError(false);
                    }}
                  />
                  <span>
                    {t`I’m signing up for a business and accept the`}{' '}
                    <a href={GROWTH_OS_BRAND.legal.terms} target="_blank" rel="noreferrer">{t`Terms`}</a>{' '}
                    {t`and`}{' '}
                    <a href={GROWTH_OS_BRAND.legal.dpa} target="_blank" rel="noreferrer">{t`DPA`}</a>
                    {'. '}
                    {t`See our`}{' '}
                    <a href={GROWTH_OS_BRAND.legal.privacy} target="_blank" rel="noreferrer">{t`Privacy Policy`}</a>.
                  </span>
                </label>
                <div className="gos-slot">
                  {showTermsError && !hasAcceptedTerms && (
                    <p className="gos-error">{t`Confirm the business terms to continue.`}</p>
                  )}
                </div>
              </div>
            )}
          <StyledSsoButtonContainer>
            <button
              className="gos-btn gos-btn-primary gos-btn-block"
              type="submit"
              disabled={isSubmitButtonDisabled}
              aria-busy={form.formState.isSubmitting || undefined}
            >
              {form.formState.isSubmitting && <span className="gos-spinner" aria-hidden="true" />}
              {form.formState.isSubmitting
                ? signInUpMode === SignInUpMode.SignUp
                  ? t`Creating your workspace…`
                  : t`Signing in…`
                : buttonTitle}
            </button>
            {isLastUsed && <LastUsedPill />}
            {!isInviteMode && (
              <p className="gos-mode-switch">
                {signInUpMode === SignInUpMode.SignUp ? t`Already have an account?` : t`New here?`}{' '}
                <button
                  type="button"
                  className="gos-linklike"
                  data-testid="growth-os-mode-switch"
                  onClick={() => {
                    setGrowthOsAuthAlert(null);
                    setPasswordProblem(null);
                    setSignInUpMode(
                      signInUpMode === SignInUpMode.SignUp
                        ? SignInUpMode.SignIn
                        : SignInUpMode.SignUp,
                    );
                  }}
                >
                  {signInUpMode === SignInUpMode.SignUp ? t`Sign in` : t`Start a 14-day trial`}
                </button>
              </p>
            )}
            {isSignUpBlockedByDDLLock && (
              <InputHint>{t`Sign-up is temporarily unavailable during maintenance.`}</InputHint>
            )}
          </StyledSsoButtonContainer>
        </StyledForm>
      )}
    </>
  );
};

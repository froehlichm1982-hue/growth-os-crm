import { useAuth } from '@/auth/hooks/useAuth';
import {
  type OTPFormValues,
  useTwoFactorAuthenticationForm,
} from '@/auth/sign-in-up/hooks/useTwoFactorAuthenticationForm';
import { loginTokenState } from '@/auth/states/loginTokenState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { useReadCaptchaToken } from '@/captcha/hooks/useReadCaptchaToken';
import { useCaptcha } from '@/client-config/hooks/useCaptcha';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useLingui } from '@lingui/react/macro';
import { OTPInput, type SlotProps } from 'input-otp';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { AppPath } from 'twenty-shared/types';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

const GosArrowLeft = createGosIcon('arrow-left', 'GosTotpBack');

// DS v2.9 two-factor.html: six boxes, 3 + gap + 3. input-otp renders one real
// <input> over these boxes, so the boxes are plain divs styled like `.gos-otp input`
// (growth-os-auth.css `.growth-os-otp-slot`), not the DS `.gos-otp input` rule.
const Slot = (props: SlotProps) => (
  <div className="growth-os-otp-slot" data-active={props.isActive ? 'true' : undefined}>
    {props.char ?? ''}
    {props.hasFakeCaret && <span className="growth-os-otp-caret" />}
  </div>
);

export const SignInUpTOTPVerification = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { getAuthTokensFromOTP } = useAuth();
  const { enqueueErrorSnackBar } = useSnackBar();

  const navigate = useNavigateApp();
  const { readCaptchaToken } = useReadCaptchaToken();
  const { isCaptchaReady } = useCaptcha();
  const loginToken = useAtomStateValue(loginTokenState);
  const setSignInUpStep = useSetAtomState(signInUpStepState);
  const { t } = useLingui();

  const { form } = useTwoFactorAuthenticationForm();

  const submitOTP = async (values: OTPFormValues) => {
    setIsLoading(true);
    try {
      if (!isCaptchaReady) {
        enqueueErrorSnackBar({
          message: t`Captcha (anti-bot check) is still loading, try again`,
        });
        setIsLoading(false);
        return;
      }

      const captchaToken = readCaptchaToken();

      if (!loginToken) {
        return navigate(AppPath.SignInUp);
      }

      await getAuthTokensFromOTP(values.otp, loginToken, captchaToken);
    } catch {
      form.setValue('otp', '');

      enqueueErrorSnackBar({
        message: t`Invalid verification code. Please try again.`,
        options: {
          dedupeKey: 'invalid-otp-dedupe-key',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // The challenge happens during sign-in: back returns to the sign-in form.
  const handleBack = () => {
    setSignInUpStep(SignInUpStep.Email);
  };

  return (
    <>
      <form
        className="gos-stack"
        style={{ width: '100%' }}
        onSubmit={form.handleSubmit(submitOTP)}
        data-testid="growth-os-2fa-challenge"
      >
        <Controller
          name="otp"
          control={form.control}
          render={({ field: { onChange, onBlur, value } }) => (
            <OTPInput
              maxLength={6}
              onBlur={onBlur}
              onChange={onChange}
              value={value}
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              aria-label={t`6-digit code`}
              containerClassName="growth-os-otp"
              render={({ slots }) => (
                <div className="growth-os-otp-row" role="presentation">
                  {slots.slice(0, 3).map((slot, idx) => (
                    // oxlint-disable-next-line react/jsx-props-no-spreading
                    <Slot key={idx} {...slot} />
                  ))}
                  <span className="growth-os-otp-gap" />
                  {slots.slice(3).map((slot, idx) => (
                    // oxlint-disable-next-line react/jsx-props-no-spreading
                    <Slot key={idx} {...slot} />
                  ))}
                </div>
              )}
            />
          )}
        />
        <button
          type="submit"
          className="gos-btn gos-btn--primary gos-btn--block gos-btn--lg"
          disabled={isLoading}
          aria-busy={isLoading || undefined}
        >
          {t`Verify`}
        </button>
      </form>
      <button type="button" className="gos-link gos-tap gos-back growth-os-linklike" onClick={handleBack}>
        <GosArrowLeft className="gos-icon sm" />
        {t`Back to sign in`}
      </button>
    </>
  );
};

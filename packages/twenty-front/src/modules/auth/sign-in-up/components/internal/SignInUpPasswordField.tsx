import { type Form } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { SignInUpMode } from '@/auth/types/signInUpMode';
import { useLingui } from '@lingui/react/macro';
import { Controller, useFormContext } from 'react-hook-form';

import { GrowthOsPasswordInput } from '~/growth-os/auth/GrowthOsAuthFields';

// Growth OS: kit password field. Sign-in: toggle, Caps Lock hint and
// "Forgot password?" on the label row. Sign-up: live rules + strength meter.
export const SignInUpPasswordField = ({
  showErrors,
  signInUpMode,
  onForgotPassword,
  extraError,
}: {
  showErrors: boolean;
  signInUpMode: SignInUpMode;
  onForgotPassword?: () => void;
  extraError?: string | null;
}) => {
  const { t } = useLingui();
  const form = useFormContext<Form>();
  const email = form.watch('email');

  return (
    <Controller
      name="password"
      control={form.control}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <GrowthOsPasswordInput
          value={value ?? ''}
          autoFocus
          mode={signInUpMode === SignInUpMode.SignUp ? 'new' : 'current'}
          email={email}
          onBlur={onBlur}
          onChange={onChange}
          error={showErrors ? (error?.message ?? extraError) : undefined}
          labelAside={
            signInUpMode === SignInUpMode.SignIn && onForgotPassword ? (
              <button type="button" className="gos-link gos-tap growth-os-linklike" onClick={onForgotPassword}>
                {t`Forgot password?`}
              </button>
            ) : undefined
          }
        />
      )}
    />
  );
};

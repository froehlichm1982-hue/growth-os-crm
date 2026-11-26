import { type Form } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { Controller, useFormContext } from 'react-hook-form';
import { isDefined } from 'twenty-shared/utils';

import { GrowthOsEmailInput } from '~/growth-os/auth/GrowthOsAuthFields';

// Growth OS: kit email field (label above, reserved error slot, 44px).
export const SignInUpEmailField = ({
  showErrors,
  onInputChange,
  autoFocus = true,
}: {
  showErrors: boolean;
  onInputChange?: (value: string) => void;
  autoFocus?: boolean;
}) => {
  const form = useFormContext<Form>();

  return (
    <Controller
      name="email"
      control={form.control}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <GrowthOsEmailInput
          value={value ?? ''}
          autoFocus={autoFocus}
          onBlur={onBlur}
          onChange={(email: string) => {
            if (isDefined(onInputChange)) onInputChange(email);
            onChange(email);
          }}
          error={showErrors ? error?.message : undefined}
        />
      )}
    />
  );
};

import { msg } from '@lingui/core/macro';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { growthOsGetPasswordProblem } from 'src/engine/core-modules/growth-os/password/growth-os-password-policy';

// Rejects with a reason the user can act on (product standard §4.1 rule 7).
export const growthOsAssertPasswordPolicy = (
  password: string,
  email?: string | null,
) => {
  const problem = growthOsGetPasswordProblem(password, email);

  if (problem === null) {
    return;
  }

  const userFriendlyMessage =
    problem === 'too-short'
      ? msg`Use at least 8 characters.`
      : problem === 'too-long'
        ? msg`Use at most 128 characters.`
        : problem === 'common'
          ? msg`This password is too common. Try a short phrase only you would know.`
          : msg`Don’t use your email name in your password.`;

  throw new AuthException(
    `Password rejected: ${problem}`,
    AuthExceptionCode.INVALID_INPUT,
    { userFriendlyMessage },
  );
};

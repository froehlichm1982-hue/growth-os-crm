import { GROWTH_OS_COMMON_PASSWORDS } from 'src/engine/core-modules/growth-os/password/growth-os-common-passwords.generated';

// Growth OS CRM password policy (product standard §4.1, corrected 25 Nov 2026):
// minimum 8 characters, maximum 128, not on the bundled common/breached list,
// does not contain the email name. No composition rules (NIST SP 800-63B-4).
// The list is checked offline; no password or hash prefix ever leaves the server.

export const GROWTH_OS_PASSWORD_MIN_LENGTH = 8;
export const GROWTH_OS_PASSWORD_MAX_LENGTH = 128;

export type GrowthOsPasswordProblem =
  | 'too-short'
  | 'too-long'
  | 'common'
  | 'contains-email';

let commonPasswords: Set<string> | null = null;

const getCommonPasswords = () => {
  if (!commonPasswords) {
    commonPasswords = new Set(GROWTH_OS_COMMON_PASSWORDS.split('\n'));
  }

  return commonPasswords;
};

export const growthOsIsCommonPassword = (password: string) =>
  getCommonPasswords().has(password.trim().toLowerCase());

export const growthOsGetPasswordProblem = (
  password: string,
  email?: string | null,
): GrowthOsPasswordProblem | null => {
  // Length counts Unicode code points, not UTF-16 units.
  const length = [...password].length;

  if (length < GROWTH_OS_PASSWORD_MIN_LENGTH) return 'too-short';
  if (length > GROWTH_OS_PASSWORD_MAX_LENGTH) return 'too-long';
  if (growthOsIsCommonPassword(password)) return 'common';

  const emailName = (email ?? '').split('@')[0]?.split('+')[0]?.toLowerCase() ?? '';

  if (emailName.length >= 3 && password.toLowerCase().includes(emailName)) {
    return 'contains-email';
  }

  return null;
};

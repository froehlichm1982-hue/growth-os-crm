import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// Growth OS CRM password rules (product standard §4.1, corrected 25 Nov 2026):
// at least 8 characters (max 128), not on the bundled common/breached list,
// does not contain the email name. No composition rules. The server enforces
// the same policy (growth-os/password/growth-os-password-policy.ts).

export const GROWTH_OS_PASSWORD_MIN = 8;
export const GROWTH_OS_PASSWORD_MAX = 128;

let commonPasswords: Set<string> | null = null;
let loading: Promise<Set<string>> | null = null;

// Lazy chunk (~350 kB raw, ~120 kB gzip), loaded only where a new password is typed.
export const growthOsLoadCommonPasswords = () => {
  if (commonPasswords) return Promise.resolve(commonPasswords);
  if (!loading) {
    loading = import('~/growth-os/auth/growthOsCommonPasswords.generated').then(
      ({ GROWTH_OS_COMMON_PASSWORDS }) => {
        commonPasswords = new Set(GROWTH_OS_COMMON_PASSWORDS.split('\n'));

        return commonPasswords;
      },
    );
  }

  return loading;
};

export const growthOsIsCommonPassword = (password: string) =>
  commonPasswords?.has(password.trim().toLowerCase()) ?? false;

export type GrowthOsPasswordChecks = {
  length: boolean;
  notCommon: boolean;
  notEmailName: boolean;
  tooLong: boolean;
};

const emailNameOf = (email?: string | null) =>
  (email ?? '').split('@')[0]?.split('+')[0]?.toLowerCase() ?? '';

export const growthOsCheckPassword = (
  password: string,
  email?: string | null,
): GrowthOsPasswordChecks => {
  const length = [...password].length;
  const emailName = emailNameOf(email);

  return {
    length: length >= GROWTH_OS_PASSWORD_MIN,
    tooLong: length > GROWTH_OS_PASSWORD_MAX,
    notCommon: password.length > 0 && !growthOsIsCommonPassword(password),
    notEmailName:
      password.length > 0 &&
      !(emailName.length >= 3 && password.toLowerCase().includes(emailName)),
  };
};

// Guidance only (4 segments); only length + blocklist block submit.
export const growthOsPasswordScore = (
  password: string,
  email?: string | null,
): 0 | 1 | 2 | 3 | 4 => {
  if (password.length === 0) return 0;
  const checks = growthOsCheckPassword(password, email);

  if (!checks.length || !checks.notCommon) return 1;
  const length = [...password].length;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/, /\s/].filter((r) =>
    r.test(password),
  ).length;
  const points = (length >= 12 ? 2 : length >= 10 ? 1 : 0) + (variety >= 3 ? 1 : 0) + (length >= 16 ? 1 : 0);

  if (!checks.notEmailName) return 2;

  return points >= 3 ? 4 : points >= 1 ? 3 : 2;
};

// First problem as one actionable sentence (rule 7), or null.
export const growthOsPasswordError = (
  password: string,
  email: string | null | undefined,
): MessageDescriptor | null => {
  if (password.length === 0) return msg`Enter a password.`;
  const checks = growthOsCheckPassword(password, email);
  const count = [...password].length;

  if (!checks.length) return msg`Use at least 8 characters (${count}/8).`;
  if (checks.tooLong) return msg`Use at most 128 characters.`;
  if (!checks.notCommon) return msg`This password is too common. Try a short phrase only you would know.`;
  if (!checks.notEmailName) return msg`Don’t use your email name in your password.`;

  return null;
};

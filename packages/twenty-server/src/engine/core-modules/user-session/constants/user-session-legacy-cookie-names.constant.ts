// Growth OS CRM renamed the session cookies (no upstream name in the browser).
// Cookies issued under the old names are still accepted until they expire and
// are cleared on sign-out, so nobody is logged out by the rename.
export const USER_SESSION_LEGACY_COOKIE_NAME = 'twenty-session';
export const USER_SESSION_LEGACY_SECURE_COOKIE_NAME = '__Host-twenty-session';
export const USER_SESSION_LEGACY_IMPERSONATOR_COOKIE_NAME =
  'twenty-impersonator-session';
export const USER_SESSION_LEGACY_IMPERSONATOR_SECURE_COOKIE_NAME =
  '__Host-twenty-impersonator-session';

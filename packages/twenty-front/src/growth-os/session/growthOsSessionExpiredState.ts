import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// Product standard §4 "Session expired": a modal over the current page, so the
// person keeps their place (and unsaved input) and re-authenticates in place.
export type GrowthOsSessionExpired = { email: string };

export const growthOsSessionExpiredState =
  createAtomState<GrowthOsSessionExpired | null>({
    key: 'growthOsSessionExpiredState',
    defaultValue: null,
  });

// Logout toast (§4 "Logout"): set right before sign-out, read once on the
// sign-in page. sessionStorage survives the reload that clears the session.
export const GROWTH_OS_SIGNED_OUT_KEY = 'growth-os-signed-out';
// OAuth provider remembered across the OAuth round trip, so an error coming
// back as ?errorMessage= can name it (§4 "OAuth return").
export const GROWTH_OS_OAUTH_PROVIDER_KEY = 'growth-os-oauth-provider';

export const growthOsRemember = (key: string, value: string) => {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Private mode without storage: the hint is optional.
  }
};

export const growthOsTake = (key: string) => {
  try {
    const value = window.sessionStorage.getItem(key);

    window.sessionStorage.removeItem(key);

    return value;
  } catch {
    return null;
  }
};

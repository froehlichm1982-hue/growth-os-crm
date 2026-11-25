import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// Inline auth alert (product standard §4: errors the user must act on are an
// alert in the card, never only a toast).
export type GrowthOsAuthAlert = {
  tone: 'danger' | 'warn' | 'success' | 'info';
  message: string;
  // Sign-in paused until this timestamp (ms); drives the live countdown.
  lockedUntil?: number;
};

export const growthOsAuthAlertState = createAtomState<GrowthOsAuthAlert | null>({
  key: 'growthOsAuthAlertState',
  defaultValue: null,
});

// Reset link requested from the sign-in card (drives the cooldown panel).
export type GrowthOsResetSent = { email: string; sentAt: number; sends: number };

export const growthOsResetSentState = createAtomState<GrowthOsResetSent | null>({
  key: 'growthOsResetSentState',
  defaultValue: null,
});

// Kit cooldown: 60 s after the first send, then 120 s.
export const growthOsResetCooldownSeconds = (sends: number) =>
  sends <= 1 ? 60 : 120;

export const growthOsParseLockedSeconds = (rawMessage: string) => {
  const match = /growth-os-locked-seconds:(\d+)/.exec(rawMessage);

  return match ? Number(match[1]) : null;
};

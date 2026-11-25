import { growthOsAssertPasswordPolicy } from 'src/engine/core-modules/growth-os/password/growth-os-assert-password-policy.util';
import {
  growthOsGetPasswordProblem,
  growthOsIsCommonPassword,
} from 'src/engine/core-modules/growth-os/password/growth-os-password-policy';
import {
  GROWTH_OS_SIGN_IN_LOCK_MS,
  GrowthOsSignInLockoutService,
} from 'src/engine/core-modules/growth-os/password/growth-os-sign-in-lockout.service';
import { type CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';

describe('Growth OS password policy (min 8, max 128, breached list, no composition rules)', () => {
  it('rejects fewer than 8 characters', () => {
    expect(growthOsGetPasswordProblem('fjord12')).toBe('too-short');
  });

  it('accepts 8 lowercase letters (no composition rules)', () => {
    expect(growthOsGetPasswordProblem('kestrelx')).toBeNull();
  });

  it('accepts a passphrase with spaces and unicode', () => {
    expect(growthOsGetPasswordProblem('nordlicht über dem fjord')).toBeNull();
  });

  it('counts code points, not UTF-16 units', () => {
    expect(growthOsGetPasswordProblem('😀😀😀😀😀😀😀')).toBe('too-short');
    expect(growthOsGetPasswordProblem('😀😀😀😀😀😀😀😀')).toBeNull();
  });

  it('rejects more than 128 characters', () => {
    expect(growthOsGetPasswordProblem('a'.repeat(129) + 'Q')).toBe('too-long');
    expect(growthOsGetPasswordProblem('kz'.repeat(64))).toBeNull();
  });

  it('rejects passwords on the offline breached list, case-insensitive', () => {
    expect(growthOsIsCommonPassword('password')).toBe(true);
    expect(growthOsGetPasswordProblem('Password')).toBe('common');
    expect(growthOsGetPasswordProblem('12345678')).toBe('common');
    expect(growthOsGetPasswordProblem('iloveyou')).toBe('common');
  });

  it('rejects the email name inside the password', () => {
    expect(
      growthOsGetPasswordProblem('lena.hartmann-2026', 'lena.hartmann@getnordlicht.example'),
    ).toBe('contains-email');
    expect(
      growthOsGetPasswordProblem('fjord-lights-2026', 'lena.hartmann@getnordlicht.example'),
    ).toBeNull();
  });

  it('throws a user-actionable error', () => {
    expect(() => growthOsAssertPasswordPolicy('short')).toThrow(
      'Password rejected: too-short',
    );
    expect(() => growthOsAssertPasswordPolicy('Fjord-lights-2026')).not.toThrow();
  });
});

describe('Growth OS sign-in lockout (5 failures → 15 minutes)', () => {
  const makeCache = () => {
    const store = new Map<string, unknown>();

    return {
      store,
      cache: {
        get: jest.fn(async (key: string) => store.get(key)),
        set: jest.fn(async (key: string, value: unknown) => {
          store.set(key, value);
        }),
        del: jest.fn(async (key: string) => {
          store.delete(key);
        }),
      } as unknown as CacheStorageService,
    };
  };

  afterEach(() => jest.useRealTimers());

  it('counts down remaining attempts, then locks on the 5th failure', async () => {
    const { cache } = makeCache();
    const service = new GrowthOsSignInLockoutService(cache);
    const email = 'Lena.Hartmann@getnordlicht.example';

    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(service.recordFailureAndThrow(email)).rejects.toThrow(
        `growth-os-remaining:${5 - attempt}`,
      );
    }
    await expect(service.recordFailureAndThrow(email)).rejects.toThrow(
      /growth-os-locked-seconds:900\b/,
    );
    // email is normalised: lower-case variant is locked too
    await expect(
      service.assertNotLocked('lena.hartmann@getnordlicht.example'),
    ).rejects.toThrow(/growth-os-locked-seconds:\d+/);
  });

  it('unlocks after 15 minutes', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-25T20:00:00Z') });
    const { cache } = makeCache();
    const service = new GrowthOsSignInLockoutService(cache);
    const email = 'jonas.berg@getnordlicht.example';

    for (let attempt = 0; attempt < 5; attempt++) {
      await service.recordFailureAndThrow(email).catch(() => undefined);
    }
    await expect(service.assertNotLocked(email)).rejects.toThrow();
    jest.setSystemTime(Date.now() + GROWTH_OS_SIGN_IN_LOCK_MS + 1000);
    await expect(service.assertNotLocked(email)).resolves.toBeUndefined();
  });

  it('starts a new window when failures are more than 15 minutes apart', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-25T20:00:00Z') });
    const { cache } = makeCache();
    const service = new GrowthOsSignInLockoutService(cache);
    const email = 'mira.koch@getnordlicht.example';

    for (let attempt = 0; attempt < 4; attempt++) {
      await service.recordFailureAndThrow(email).catch(() => undefined);
    }
    jest.setSystemTime(Date.now() + GROWTH_OS_SIGN_IN_LOCK_MS + 1000);
    await expect(service.recordFailureAndThrow(email)).rejects.toThrow(
      'growth-os-remaining:4',
    );
  });

  it('clear() resets the counter after a successful sign-in', async () => {
    const { cache, store } = makeCache();
    const service = new GrowthOsSignInLockoutService(cache);

    await service.recordFailureAndThrow('a.b@example.com').catch(() => undefined);
    await service.clear('a.b@example.com');
    expect(store.size).toBe(0);
  });
});

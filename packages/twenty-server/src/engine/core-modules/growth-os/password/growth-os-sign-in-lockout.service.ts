import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';

// Growth OS CRM sign-in lockout (product standard §4): 5 failed password
// attempts for one email within 15 minutes pause password sign-in for that
// email for 15 minutes. Messages never reveal whether the account exists.
export const GROWTH_OS_SIGN_IN_MAX_FAILURES = 5;
export const GROWTH_OS_SIGN_IN_LOCK_MS = 15 * 60 * 1000;

type LockoutState = { failures: number; firstFailureAt: number; lockedUntil?: number };

@Injectable()
export class GrowthOsSignInLockoutService {
  constructor(
    @InjectCacheStorage(CacheStorageNamespace.EngineWorkspace)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  private key(email: string) {
    return `growth-os:sign-in-failures:${email.trim().toLowerCase()}`;
  }

  async assertNotLocked(email: string) {
    const state = await this.cacheStorage.get<LockoutState>(this.key(email));

    if (state?.lockedUntil && state.lockedUntil > Date.now()) {
      this.throwLocked(state.lockedUntil);
    }
  }

  async recordFailureAndThrow(email: string): Promise<never> {
    const now = Date.now();
    const key = this.key(email);
    const previous = await this.cacheStorage.get<LockoutState>(key);
    const inWindow =
      previous && now - previous.firstFailureAt < GROWTH_OS_SIGN_IN_LOCK_MS;
    const state: LockoutState = inWindow
      ? { ...previous, failures: previous.failures + 1 }
      : { failures: 1, firstFailureAt: now };

    if (state.failures >= GROWTH_OS_SIGN_IN_MAX_FAILURES) {
      state.lockedUntil = now + GROWTH_OS_SIGN_IN_LOCK_MS;
    }

    await this.cacheStorage.set(key, state, GROWTH_OS_SIGN_IN_LOCK_MS * 2);

    if (state.lockedUntil) {
      this.throwLocked(state.lockedUntil);
    }

    const remaining = GROWTH_OS_SIGN_IN_MAX_FAILURES - state.failures;

    throw new AuthException(
      `Wrong password (growth-os-remaining:${remaining})`,
      AuthExceptionCode.FORBIDDEN_EXCEPTION,
      {
        userFriendlyMessage: msg`That email and password don’t match. After ${remaining} more attempts we’ll pause sign-in for 15 minutes.`,
      },
    );
  }

  async clear(email: string) {
    await this.cacheStorage.del(this.key(email));
  }

  private throwLocked(lockedUntil: number): never {
    const seconds = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000));
    const minutes = Math.ceil(seconds / 60);

    throw new AuthException(
      `Sign-in paused (growth-os-locked-seconds:${seconds})`,
      AuthExceptionCode.FORBIDDEN_EXCEPTION,
      {
        userFriendlyMessage: msg`Too many attempts. Try again in ${minutes} minutes or reset your password.`,
      },
    );
  }
}

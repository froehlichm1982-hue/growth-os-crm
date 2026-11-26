// Kit mail rendering does not finish inside jest (it is covered by the mail
// shot run); here the template props stand in for the rendered mail.
jest.mock('twenty-emails', () => {
  const actual = jest.requireActual('twenty-emails');

  return {
    ...actual,
    AccountExistsEmail: (props: unknown) => ({ props }),
    renderEmail: async (element: { props: unknown }) => JSON.stringify(element.props),
  };
});

import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { AuthResolver } from 'src/engine/core-modules/auth/auth.resolver';
import { AuthService } from 'src/engine/core-modules/auth/services/auth.service';
import { type CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { EmailVerificationResolver } from 'src/engine/core-modules/email-verification/email-verification.resolver';
import {
  EmailVerificationException,
  EmailVerificationExceptionCode,
} from 'src/engine/core-modules/email-verification/email-verification.exception';
import {
  GROWTH_OS_NEUTRAL_USER_EXISTS,
  GrowthOsAccountExistsMailService,
} from 'src/engine/core-modules/growth-os/password/growth-os-neutral-auth';
import { GrowthOsSignInLockoutService } from 'src/engine/core-modules/growth-os/password/growth-os-sign-in-lockout.service';

const makeLockout = () => {
  const store = new Map<string, unknown>();
  const cache = {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  } as unknown as CacheStorageService;

  return new GrowthOsSignInLockoutService(cache);
};

const captureError = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    const e = error as { code?: string; message: string; userFriendlyMessage?: { message?: string; id?: string } };

    return {
      code: e.code,
      message: e.message,
      friendly: e.userFriendlyMessage?.id ?? e.userFriendlyMessage?.message,
    };
  }
  throw new Error('expected an error');
};

describe('Growth OS: sign-in does not reveal whether an account exists', () => {
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword('Fjord-lights-2026');
  });

  const makeAuthService = (users: Record<string, unknown>) => {
    const service = Object.create(AuthService.prototype) as AuthService;

    Object.assign(service, {
      userRepository: {
        findOne: jest.fn(async ({ where }: { where: { email: string } }) => users[where.email] ?? null),
      },
      growthOsSignInLockoutService: makeLockout(),
      twentyConfigService: { get: jest.fn(() => false) },
    });

    return service;
  };

  it('answers an unknown email exactly like a wrong password', async () => {
    const service = makeAuthService({
      'lena.hartmann@getnordlicht.example': {
        id: 'u1',
        email: 'lena.hartmann@getnordlicht.example',
        passwordHash,
        isEmailVerified: true,
        userWorkspaces: [],
      },
    });

    const wrongPassword = await captureError(() =>
      service.validateLoginWithPassword({ email: 'lena.hartmann@getnordlicht.example', password: 'not-the-password' } as never),
    );
    const unknownEmail = await captureError(() =>
      service.validateLoginWithPassword({ email: 'nobody@getnordlicht.example', password: 'not-the-password' } as never),
    );

    expect(unknownEmail.code).toBe(wrongPassword.code);
    expect(unknownEmail.friendly).toBe(wrongPassword.friendly);
    expect(unknownEmail.message).toBe(wrongPassword.message);
    expect(unknownEmail.message).not.toMatch(/not found/i);
  });

  it('answers a user without a password (Google/Microsoft only) like a wrong password', async () => {
    const service = makeAuthService({
      'mira.koch@getnordlicht.example': { id: 'u2', email: 'mira.koch@getnordlicht.example', passwordHash: null, userWorkspaces: [] },
    });

    const result = await captureError(() =>
      service.validateLoginWithPassword({ email: 'mira.koch@getnordlicht.example', password: 'whatever-123' } as never),
    );

    expect(result.message).not.toMatch(/login method/i);
    expect(result.message).toMatch(/growth-os-remaining:4/);
  });

  it('locks unknown emails after 5 failures, like known ones', async () => {
    const service = makeAuthService({});

    for (let i = 0; i < 4; i++) {
      await captureError(() => service.validateLoginWithPassword({ email: 'ghost@getnordlicht.example', password: `x-${i}-wrong` } as never));
    }
    const fifth = await captureError(() =>
      service.validateLoginWithPassword({ email: 'ghost@getnordlicht.example', password: 'x-5-wrong' } as never),
    );

    expect(fifth.message).toMatch(/growth-os-locked-seconds/);
  });

  it('still signs in with the right password', async () => {
    const user = { id: 'u1', email: 'lena.hartmann@getnordlicht.example', passwordHash, isEmailVerified: true, userWorkspaces: [] };
    const service = makeAuthService({ [user.email]: user });

    await expect(
      service.validateLoginWithPassword({ email: user.email, password: 'Fjord-lights-2026' } as never),
    ).resolves.toBe(user);
  });
});

describe('Growth OS: email step and sign-up are neutral', () => {
  const makeResolver = (existing: boolean) => {
    const resolver = Object.create(AuthResolver.prototype) as AuthResolver;
    const mail = {
      isEmailVerificationRequired: jest.fn(() => true),
      notify: jest.fn(async () => true),
    };
    const deps = {
      authService: { checkUserExists: jest.fn() },
      userService: {
        findUserByEmail: jest.fn(async (email: string) => (existing ? { id: 'u1', email } : null)),
      },
      signInUpService: {
        signUpWithoutWorkspace: jest.fn(async ({ email }: { email: string }) => ({ id: 'new', email })),
      },
      emailVerificationService: { sendVerificationEmail: jest.fn(async () => ({ success: true })) },
      userSessionService: { issueSessionForTokenPair: jest.fn() },
      growthOsAccountExistsMail: mail,
    };

    Object.assign(resolver, deps);

    return { resolver, deps, mail };
  };

  const shape = (value: unknown): unknown =>
    value && typeof value === 'object' && !(value instanceof Date)
      ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
      : typeof value;

  it('checkUserExists gives the same answer for every email and never looks the user up', async () => {
    const { resolver, deps } = makeResolver(true);

    await expect(resolver.checkUserExists({ email: 'lena.hartmann@getnordlicht.example' } as never)).resolves.toEqual(GROWTH_OS_NEUTRAL_USER_EXISTS);
    await expect(resolver.checkUserExists({ email: 'nobody@getnordlicht.example' } as never)).resolves.toEqual(GROWTH_OS_NEUTRAL_USER_EXISTS);
    expect(deps.authService.checkUserExists).not.toHaveBeenCalled();
  });

  it('sign-up with an existing email looks like a new sign-up, mails the owner, starts no session', async () => {
    const existing = makeResolver(true);
    const fresh = makeResolver(false);
    const input = { email: 'Lena.Hartmann@getnordlicht.example', password: 'Fjord-lights-2026', locale: 'de-DE' };

    const a = await existing.resolver.signUp(input as never, { req: {} } as never);
    const b = await fresh.resolver.signUp({ ...input, email: 'new.colleague@getnordlicht.example' } as never, { req: {} } as never);

    expect(shape(a)).toEqual(shape(b));
    expect(a.availableWorkspaces).toEqual(b.availableWorkspaces);
    expect(a.tokens.accessOrWorkspaceAgnosticToken.token.length).toBe(b.tokens.accessOrWorkspaceAgnosticToken.token.length);

    expect(existing.mail.notify).toHaveBeenCalledWith('lena.hartmann@getnordlicht.example', 'de-DE');
    expect(existing.deps.signInUpService.signUpWithoutWorkspace).not.toHaveBeenCalled();
    expect(fresh.deps.emailVerificationService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(existing.deps.userSessionService.issueSessionForTokenPair).not.toHaveBeenCalled();
    expect(fresh.deps.userSessionService.issueSessionForTokenPair).not.toHaveBeenCalled();
  });

  it('rejects a weak password the same way for existing and new emails', async () => {
    const existing = makeResolver(true);
    const fresh = makeResolver(false);

    const a = await captureError(() => existing.resolver.signUp({ email: 'lena.hartmann@getnordlicht.example', password: 'password' } as never, { req: {} } as never));
    const b = await captureError(() => fresh.resolver.signUp({ email: 'new@getnordlicht.example', password: 'password' } as never, { req: {} } as never));

    expect(a).toEqual(b);
    expect(existing.mail.notify).not.toHaveBeenCalled();
  });
});

describe('Growth OS: resend verification is neutral', () => {
  const makeResolver = (error?: Error) => {
    const resolver = Object.create(EmailVerificationResolver.prototype) as EmailVerificationResolver;

    Object.assign(resolver, {
      workspaceDomainsService: { getWorkspaceByOriginOrDefaultWorkspace: jest.fn(async () => undefined) },
      emailVerificationService: {
        resendEmailVerificationToken: jest.fn(async () => {
          if (error) throw error;

          return { success: true };
        }),
      },
    });

    return resolver;
  };

  it.each([
    ['unknown email', new Error('user is undefined')],
    ['already verified', new EmailVerificationException('Email already verified', EmailVerificationExceptionCode.EMAIL_ALREADY_VERIFIED)],
    ['cooldown', new EmailVerificationException('Please wait', EmailVerificationExceptionCode.RATE_LIMIT_EXCEEDED)],
  ])('%s → success', async (_label, error) => {
    await expect(
      makeResolver(error).resendEmailVerificationToken({ email: 'x@getnordlicht.example' } as never, 'http://localhost', { req: { locale: 'en' } } as never),
    ).resolves.toEqual({ success: true });
  });
});

describe('Growth OS: "you already have an account" mail', () => {
  it('sends at most one mail per address every 10 minutes', async () => {
    const send = jest.fn(async () => undefined);
    const service = new GrowthOsAccountExistsMailService(
      { send } as never,
      { get: jest.fn((key: string) => (key === 'EMAIL_FROM_ADDRESS' ? 'noreply@scalepoint-ventures.com' : 'ScalePoint Growth OS')) } as never,
      { getBaseUrl: () => new URL('http://localhost:3000') } as never,
    );

    await expect(service.notify('Lena.Hartmann@getnordlicht.example', 'en')).resolves.toBe(true);
    await expect(service.notify('lena.hartmann@getnordlicht.example', 'en')).resolves.toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
    const mail = (send.mock.calls[0] as unknown as [{ to: string; subject: string; html: string }])[0];

    expect(mail.to).toBe('lena.hartmann@getnordlicht.example');
    expect(mail.subject).toBe('You already have a Growth OS account');
    expect(mail.html).toContain('/welcome');
    expect(mail.html).not.toMatch(/twenty/i);
  });
});

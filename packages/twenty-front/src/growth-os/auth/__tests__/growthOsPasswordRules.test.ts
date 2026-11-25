import {
  growthOsCheckPassword,
  growthOsLoadCommonPasswords,
  growthOsPasswordError,
  growthOsPasswordScore,
} from '~/growth-os/auth/growthOsPasswordRules';
import {
  growthOsParseLockedSeconds,
  growthOsResetCooldownSeconds,
} from '~/growth-os/auth/growthOsAuthAlertState';

describe('growthOsPasswordRules (min 8, max 128, breached list, no composition rules)', () => {
  beforeAll(async () => {
    await growthOsLoadCommonPasswords();
  });

  it('accepts 8 lowercase letters', () => {
    expect(growthOsPasswordError('kestrelx', 'lena@getnordlicht.example')).toBeNull();
  });

  it('rejects short, too long, common and email-name passwords', () => {
    expect(growthOsPasswordError('fjord12', '')).not.toBeNull();
    expect(growthOsPasswordError('a'.repeat(129), '')).not.toBeNull();
    expect(growthOsPasswordError('password', '')).not.toBeNull();
    expect(
      growthOsPasswordError('lena.hartmann99', 'lena.hartmann@getnordlicht.example'),
    ).not.toBeNull();
  });

  it('reports each rule separately for the live checklist', () => {
    const result = growthOsCheckPassword('fjord-lights-2026', 'lena@x.example');

    expect(result.length).toBe(true);
    expect(result.tooLong).toBe(false);
    expect(result.notCommon).toBe(true);
    expect(result.notEmailName).toBe(true);
  });

  it('scores a long passphrase higher than a short word', () => {
    expect(growthOsPasswordScore('nordlicht über dem fjord', '')).toBeGreaterThan(
      growthOsPasswordScore('kestrelx', ''),
    );
  });
});

describe('growthOsAuthAlertState helpers', () => {
  it('uses a 60 s then 120 s resend cooldown', () => {
    expect(growthOsResetCooldownSeconds(1)).toBe(60);
    expect(growthOsResetCooldownSeconds(2)).toBe(120);
    expect(growthOsResetCooldownSeconds(5)).toBe(120);
  });

  it('parses the lockout marker from the server message', () => {
    expect(
      growthOsParseLockedSeconds('Sign-in paused (growth-os-locked-seconds:900)'),
    ).toBe(900);
    expect(growthOsParseLockedSeconds('Wrong password')).toBeNull();
  });
});

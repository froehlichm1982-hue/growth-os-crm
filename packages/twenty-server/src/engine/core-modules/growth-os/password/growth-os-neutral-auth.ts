import { Injectable, Logger } from '@nestjs/common';

import { randomBytes } from 'crypto';

import { AccountExistsEmail, accountExistsSubject, renderEmail } from 'twenty-emails';
import { type APP_LOCALES } from 'twenty-shared/translations';

import { compareHash } from 'src/engine/core-modules/auth/auth.util';
import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

// Growth OS CRM: account-enumeration hardening (product standard §4).
// The email step, sign-in errors, sign-up and "resend verification" answer the
// same way whether or not an account exists for the email.

// What checkUserExists returns for every email. The front decides between
// sign-in and sign-up from what the person chose, not from this answer.
export const GROWTH_OS_NEUTRAL_USER_EXISTS = {
  exists: false,
  availableWorkspacesCount: 0,
  isEmailVerified: false,
} as const;

// A bcrypt hash of a random throwaway value: comparing against it makes an
// unknown email cost the same time as a wrong password.
const GROWTH_OS_DUMMY_HASH =
  '$2b$10$8xjWKgtkpy9qrYHAIbKe7.nnZtqOe70fbyIELKAbyT63Qq6Rn1sy.';

export const growthOsSpendHashTime = async (password: string) => {
  try {
    await compareHash(password, GROWTH_OS_DUMMY_HASH);
  } catch {
    // timing only
  }
};

// Same shape as a real sign-up answer; carries no usable token. Used for every
// sign-up while email verification is required (the session starts after the
// person confirms their email), so new and existing emails look identical.
export const growthOsNeutralSignUpResult = () => {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const opaque = () => randomBytes(96).toString('base64url');

  return {
    tokens: {
      accessOrWorkspaceAgnosticToken: { token: opaque(), expiresAt },
      refreshToken: { token: opaque(), expiresAt },
    },
    availableWorkspaces: {
      availableWorkspacesForSignIn: [],
      availableWorkspacesForSignUp: [],
    },
  };
};

const NOTIFY_COOLDOWN_MS = 10 * 60 * 1000;

@Injectable()
export class GrowthOsAccountExistsMailService {
  private readonly logger = new Logger(GrowthOsAccountExistsMailService.name);
  private readonly lastSentAt = new Map<string, number>();

  constructor(
    private readonly emailService: EmailService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly domainServerConfigService: DomainServerConfigService,
  ) {}

  isEmailVerificationRequired() {
    return this.twentyConfigService.get('IS_EMAIL_VERIFICATION_REQUIRED') === true;
  }

  // Tells the owner that someone tried to sign up with their address.
  // At most one mail per address every 10 minutes.
  async notify(email: string, locale: keyof typeof APP_LOCALES) {
    const key = email.trim().toLowerCase();
    const now = Date.now();
    const last = this.lastSentAt.get(key);

    if (last !== undefined && now - last < NOTIFY_COOLDOWN_MS) return false;
    this.lastSentAt.set(key, now);

    try {
      const base = this.domainServerConfigService.getBaseUrl();
      const signInLink = new URL('/welcome', base).toString();
      const template = AccountExistsEmail({
        email: key,
        signInLink,
        resetLink: signInLink,
        locale,
      });
      const html = await renderEmail(template, { pretty: true });
      const text = await renderEmail(template, { plainText: true });

      await this.emailService.send({
        from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
        to: key,
        subject: accountExistsSubject(locale),
        text,
        html,
      });

      return true;
    } catch (error) {
      this.logger.warn(`account-exists mail failed: ${String(error)}`);

      return false;
    }
  }
}

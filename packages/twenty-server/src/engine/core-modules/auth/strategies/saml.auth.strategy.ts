/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/core-modules/auth/strategies/saml.auth.strategy.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

// Growth OS CRM: SAML SSO is an Enterprise feature and is disabled. Keep a
// valid MultiSamlStrategy options object so Nest DI can boot the auth module,
// while rejecting every SAML request.
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  MultiSamlStrategy,
  type VerifyWithRequest,
} from '@node-saml/passport-saml';
import { type Request } from 'express';

export type SamlRequest = Omit<
  Request,
  'user' | 'workspace' | 'workspaceMetadataVersion'
> & {
  user: {
    identityProviderId: string;
    workspaceInviteHash?: string;
    email: string;
  };
};

@Injectable()
export class SamlAuthStrategy extends PassportStrategy(
  MultiSamlStrategy,
  'saml',
) {
  constructor() {
    super(
      {
        passReqToCallback: true,
        getSamlOptions: (_req, done) =>
          done(new Error('Growth OS CRM: SAML SSO is not available.')),
      },
      ((_req, _profile, done) =>
        done(
          new Error('Growth OS CRM: SAML SSO is not available.'),
        )) as VerifyWithRequest,
    );
  }

  authenticate(): any {
    throw new Error('Growth OS CRM: SAML SSO is not available.');
  }

  validate!: VerifyWithRequest;
}

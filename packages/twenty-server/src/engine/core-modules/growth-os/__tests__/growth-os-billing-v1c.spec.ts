import { UserInputError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { GrowthOsBillingClient, GrowthOsBillingHttpError } from 'src/engine/core-modules/growth-os/growth-os-billing.client';
import {
  GrowthOsBillingService,
  INTERVAL_CONFLICT_MESSAGE_DE,
  INTERVAL_CONFLICT_MESSAGE_EN,
} from 'src/engine/core-modules/growth-os/growth-os-billing.service';
import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { computeEffectiveEntitlement } from 'src/engine/core-modules/growth-os/utils/compute-effective-entitlement.util';

const WS = '55555555-5555-4555-8555-555555555555';
const RETURN = 'https://spv.crm.scalepoint-ventures.com/settings/billing';

const makeService = (request: jest.Mock, account: Record<string, unknown> | null = { accountId: 'acc_1', email: 'a@b.example', locale: 'en', workspaceId: WS }) => {
  const client = { isLive: () => true, request, getMockSessionUrl: jest.fn() } as unknown as GrowthOsBillingClient;
  const entitlements = {
    getBillingAccount: jest.fn(async () => account),
    getBillingContact: jest.fn(async () => ({ email: 'owner@example.test', name: 'Owner', workspaceName: 'SPV', locale: 'de' })),
    saveBillingAccount: jest.fn(async () => undefined),
    applyUpdate: jest.fn(async () => undefined),
  };

  return { service: new GrowthOsBillingService(client, entitlements as unknown as GrowthOsEntitlementService), entitlements };
};

describe('POST /v1/accounts is idempotent', () => {
  const existing = {
    account_id: 'acc_existing', organisation_id: 'org_1', version: 7,
    data: { workspaceId: WS, plan: 'growth', status: 'trialing', interval: 'month', trialEndsAt: '2026-11-20T10:00:00Z' },
  };

  it('a 200 for an existing account is a success: id saved, current state applied, nothing assumed about the trial', async () => {
    const request = jest.fn(async () => existing);
    const { service, entitlements } = makeService(request, null);

    const account = await service.ensureAccount(WS);

    expect(account).toMatchObject({ accountId: 'acc_existing', organisationId: 'org_1', locale: 'de' });
    expect(entitlements.saveBillingAccount).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'acc_existing' }));
    // The trial end is the service's one (a repeat call does not restart it); we store it as sent.
    const applied = (entitlements.applyUpdate.mock.calls[0] as unknown[])[0] as { trialEndsAt: Date; version: number };

    expect(applied.trialEndsAt.toISOString()).toBe('2026-11-20T10:00:00.000Z');
    expect(applied.version).toBe(7);
  });

  it('works when the answer carries only the ids (no entitlement data)', async () => {
    const { service, entitlements } = makeService(jest.fn(async () => ({ account_id: 'acc_9', organisation_id: 'org_9' })), null);

    await expect(service.ensureAccount(WS)).resolves.toMatchObject({ accountId: 'acc_9' });
    expect(entitlements.applyUpdate).not.toHaveBeenCalled();
  });

  it('a known account is not created again (one POST per workspace, never a second trial)', async () => {
    const request = jest.fn();
    const { service } = makeService(request);

    await service.ensureAccount(WS);
    await service.ensureAccount(WS);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('POST /v1/checkout-sessions: no mode sent, url followed for checkout, confirm and noop', () => {
  const input = { kind: 'checkout' as const, workspaceId: WS, plan: 'growth' as const, interval: 'month' as const, seats: 4, returnUrl: `${RETURN}?x=1` };

  it.each([
    ['checkout', 'https://billing.example.test/pay/1'],
    ['confirm', 'https://billing.example.test/confirm/2'],
    ['noop', 'https://spv.crm.scalepoint-ventures.com/settings/billing?checkout=success'],
  ])('mode %s redirects to the returned url', async (mode, url) => {
    const request = jest.fn(async () => ({ mode, url }));
    const { service } = makeService(request);

    await expect(service.getSessionUrl(input)).resolves.toBe(url);
    const body = (request.mock.calls[0] as unknown[])[2] as Record<string, unknown>;

    expect(body).toEqual(expect.objectContaining({ price_lookup_key: 'crm_growth_m', quantity: 4, locale: 'en', cancel_url: `${RETURN}?x=1` }));
    expect(body).not.toHaveProperty('mode');
    expect(body.success_url).toBe(`${RETURN.replace('/settings/billing', '')}/settings/billing?checkout=success`);
  });

  it('409 interval_conflict shows a contact-support message in English', async () => {
    const { service } = makeService(jest.fn(async () => { throw new GrowthOsBillingHttpError(409, 'interval_conflict', '/v1/checkout-sessions'); }));
    const error = await service.getSessionUrl(input).catch((e) => e);

    expect(error).toBeInstanceOf(UserInputError);
    expect(error.message).toBe(INTERVAL_CONFLICT_MESSAGE_EN);
    expect(error.message).toContain('contact support@');
  });

  it('409 interval_conflict is German with "du" for a German account', async () => {
    const { service } = makeService(
      jest.fn(async () => { throw new GrowthOsBillingHttpError(409, 'interval_conflict', '/v1/checkout-sessions'); }),
      { accountId: 'acc_1', email: 'a@b.example', locale: 'de', workspaceId: WS },
    );
    const error = await service.getSessionUrl(input).catch((e) => e);

    expect(error.message).toBe(INTERVAL_CONFLICT_MESSAGE_DE);
    expect(error.message).toMatch(/\bdein\b/);
    expect(error.message).not.toMatch(/\bSie\b|\bIhr/);
  });

  it('other errors (another 409 code, 5xx) keep the generic unavailable message', async () => {
    for (const err of [new GrowthOsBillingHttpError(409, 'something_else', '/x'), new GrowthOsBillingHttpError(500, 'error', '/x')]) {
      const { service } = makeService(jest.fn(async () => { throw err; }));
      const error = await service.getSessionUrl(input).catch((e) => e);

      expect(error.message).toContain('Billing is unavailable');
    }
  });
});

describe('a plan bought during the no-card trial keeps the trial days', () => {
  const base = { workspaceId: WS, workspaceCreatedAt: new Date('2026-11-01T00:00:00Z'), unpaidAccess: 'read_only' as const, aiMonthlyCap: 500 };
  const row = (o: Record<string, unknown>) => ({
    workspaceId: WS, plan: 'growth' as const, status: 'trialing' as const, seats: 8, interval: 'month' as const,
    trialEndsAt: new Date('2026-11-15T00:00:00Z'), currentPeriodEnd: null, statusChangedAt: null, featureOverrides: null,
    aiMonthlyCap: null, aiUsageCount: 0, aiUsagePeriod: null, ...o,
  });

  it('trialing + lookup key = subscribed trial: still a trial, bought seats apply', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-05T00:00:00Z'), stored: row({ lookupKey: 'crm_growth_m' }) });

    expect(e).toMatchObject({ status: 'trialing', isTrial: true, hasSubscription: true, seatsPurchased: 8, seatsAllowed: 8, effectivePlan: 'growth' });
  });

  it('a plain trial (no lookup key) is unchanged: no subscription, full Growth cap', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-05T00:00:00Z'), stored: row({ seats: 0, lookupKey: null }) });

    expect(e).toMatchObject({ status: 'trialing', hasSubscription: false, seatsPurchased: null, seatsAllowed: 25 });
  });

  it('the trial end without a push of "active" falls back like a normal expiry (not subscribed)', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-16T00:00:00Z'), stored: row({ lookupKey: 'crm_growth_m' }) });

    expect(e.hasSubscription).toBe(false);
    expect(e.status).toBe('trial_expired');
  });

  it('after the first payment the service pushes active and it is a normal paid plan', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-16T00:00:00Z'), stored: row({ status: 'active', trialEndsAt: null, lookupKey: 'crm_growth_m' }) });

    expect(e).toMatchObject({ status: 'active', isTrial: false, hasSubscription: false, seatsAllowed: 8 });
  });
});

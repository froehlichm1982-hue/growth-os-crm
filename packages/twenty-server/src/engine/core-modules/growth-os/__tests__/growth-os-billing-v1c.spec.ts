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
    getSyncedAt: jest.fn(async () => null as Date | null),
    markSynced: jest.fn(async () => undefined),
    getWorkspaceIdsOfUser: jest.fn(async () => [WS]),
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

describe('a workspace without a billing account gets one when the plan page is read', () => {
  it('creates it once per 5 minutes, only when the service is live, and never throws', async () => {
    const request = jest.fn(async () => ({ account_id: 'acc_late', organisation_id: 'org_late' }));
    const { service, entitlements } = makeService(request, null);

    service.ensureAccountSoon(WS);
    service.ensureAccountSoon(WS); // throttled
    for (let i = 0; i < 30; i += 1) await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
    expect(entitlements.saveBillingAccount).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'acc_late' }));

    const failing = makeService(jest.fn(async () => { throw new Error('service down'); }), null);

    expect(() => failing.service.ensureAccountSoon(WS)).not.toThrow();
    for (let i = 0; i < 30; i += 1) await Promise.resolve();
  });

  it('does nothing in mock mode', () => {
    const request = jest.fn();
    const client = { isLive: () => false, request } as unknown as GrowthOsBillingClient;
    const service = new GrowthOsBillingService(client, {} as GrowthOsEntitlementService);

    service.ensureAccountSoon(WS);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('reconcile: GET /v1/entitlements when the plan page opens and the stored state is old', () => {
  const state = { version: 9, data: { workspaceId: WS, plan: 'growth', status: 'active', interval: 'month', seats: 4, lookupKey: 'crm_growth_m' } };
  const flush = async () => { for (let i = 0; i < 30; i += 1) await Promise.resolve(); };

  it('reads the service state once and applies it (same version ordering as a push)', async () => {
    const request = jest.fn(async () => state);
    const { service, entitlements } = makeService(request);

    entitlements.getSyncedAt.mockResolvedValue(new Date(Date.now() - 11 * 60_000));
    service.reconcileSoon(WS);
    await flush();
    expect(request).toHaveBeenCalledWith('GET', '/v1/entitlements', { product: 'crm', external_user_id: WS });
    const applied = (entitlements.applyUpdate.mock.calls[0] as unknown[])[0] as { version: number; status: string; seats: number };

    expect(applied).toMatchObject({ version: 9, status: 'active', seats: 4 });
    expect(entitlements.markSynced).toHaveBeenCalledWith(WS);
  });

  it('does nothing while the stored state is younger than 10 minutes', async () => {
    const request = jest.fn(async () => state);
    const { service, entitlements } = makeService(request);

    entitlements.getSyncedAt.mockResolvedValue(new Date(Date.now() - 9 * 60_000));
    service.reconcileSoon(WS);
    await flush();
    expect(request).not.toHaveBeenCalled();
  });

  it('at most one read per workspace per window, even when the page is opened again and again', async () => {
    const request = jest.fn(async () => state);
    const { service, entitlements } = makeService(request);

    entitlements.getSyncedAt.mockResolvedValue(null);
    for (let i = 0; i < 5; i += 1) service.reconcileSoon(WS);
    service.reconcileSoon('another-workspace');
    await flush();
    expect(request).toHaveBeenCalledTimes(2); // one per workspace
  });

  it('a workspace never synced (no stored state) is reconciled; no billing account means no read', async () => {
    const withAccount = makeService(jest.fn(async () => state));

    withAccount.entitlements.getSyncedAt.mockResolvedValue(null);
    expect(await withAccount.service.reconcile(WS)).toBe('reconciled');
    const noAccount = makeService(jest.fn(), null);

    expect(await noAccount.service.reconcile(WS)).toBe('no-account');
  });

  it('an error from the service never throws out of the page read and leaves the state alone', async () => {
    const { service, entitlements } = makeService(jest.fn(async () => { throw new GrowthOsBillingHttpError(404, 'unknown_account', '/v1/entitlements'); }));

    expect(() => service.reconcileSoon(WS)).not.toThrow();
    await flush();
    expect(entitlements.applyUpdate).not.toHaveBeenCalled();
    expect(entitlements.markSynced).not.toHaveBeenCalled();
  });

  it('does nothing in mock mode', () => {
    const request = jest.fn();
    const client = { isLive: () => false, request } as unknown as GrowthOsBillingClient;
    const service = new GrowthOsBillingService(client, {} as GrowthOsEntitlementService);

    service.reconcileSoon(WS);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('owner email / name change: POST /v1/accounts again (idempotent update)', () => {
  const oldAccount = { accountId: 'acc_1', organisationId: 'org_1', email: 'old@example.test', name: 'SPV', locale: 'de', workspaceId: WS };

  it('a changed owner email is sent once, without a trial flag, and stored', async () => {
    const request = jest.fn(async () => ({ account_id: 'acc_1', organisation_id: 'org_1', version: 3, data: { workspaceId: WS, plan: 'growth', status: 'trialing', interval: 'month' } }));
    const { service, entitlements } = makeService(request, oldAccount);

    expect(await service.syncContact(WS)).toBe('updated');
    expect(request).toHaveBeenCalledWith('POST', '/v1/accounts', { product: 'crm', external_user_id: WS, email: 'owner@example.test', name: 'SPV', locale: 'de' });
    expect((request.mock.calls[0] as unknown[])[2]).not.toHaveProperty('trial');
    expect(entitlements.saveBillingAccount).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'acc_1', email: 'owner@example.test', name: 'SPV' }));
  });

  it('a changed workspace name is the changed account name', async () => {
    const request = jest.fn(async () => ({ account_id: 'acc_1' }));
    const { service } = makeService(request, { ...oldAccount, email: 'owner@example.test', name: 'Old name' });

    expect(await service.syncContact(WS)).toBe('updated');
    expect((request.mock.calls[0] as unknown[])[2]).toMatchObject({ name: 'SPV' });
  });

  it('nothing changed: no call', async () => {
    const request = jest.fn();
    const { service } = makeService(request, { ...oldAccount, email: 'owner@example.test' });

    expect(await service.syncContact(WS)).toBe('unchanged');
    expect(request).not.toHaveBeenCalled();
  });

  it('a failing call stores nothing, so the next check retries; the best-effort wrapper never throws', async () => {
    const request = jest.fn(async () => { throw new Error('billing down'); });
    const { service, entitlements } = makeService(request, oldAccount);

    expect(await service.syncContactBestEffort(WS)).toBe('failed');
    expect(entitlements.saveBillingAccount).not.toHaveBeenCalled();
  });

  it('syncContactSoon checks at most once per workspace every 5 minutes', async () => {
    const request = jest.fn(async () => ({ account_id: 'acc_1' }));
    const { service } = makeService(request, oldAccount);

    for (let i = 0; i < 4; i += 1) service.syncContactSoon(WS);
    for (let i = 0; i < 30; i += 1) await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('syncContactForUser updates every workspace of the user; a user without workspaces does nothing', async () => {
    const request = jest.fn(async () => ({ account_id: 'acc_1' }));
    const { service, entitlements } = makeService(request, oldAccount);

    await service.syncContactForUser('user-1');
    expect(request).toHaveBeenCalledTimes(1);
    entitlements.getWorkspaceIdsOfUser.mockResolvedValue([]);
    await service.syncContactForUser('user-2');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('mock mode: no call', async () => {
    const request = jest.fn();
    const client = { isLive: () => false, request } as unknown as GrowthOsBillingClient;
    const service = new GrowthOsBillingService(client, {} as GrowthOsEntitlementService);

    expect(await service.syncContact(WS)).toBe('mock');
  });
});

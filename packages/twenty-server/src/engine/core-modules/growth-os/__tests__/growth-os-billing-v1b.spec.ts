import { chmodSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GrowthOsBillingClient } from 'src/engine/core-modules/growth-os/growth-os-billing.client';
import { GrowthOsBillingService } from 'src/engine/core-modules/growth-os/growth-os-billing.service';
import { GrowthOsBillingWebhookController } from 'src/engine/core-modules/growth-os/growth-os-billing-webhook.controller';
import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import {
  getGrowthOsConfig,
  resetGrowthOsBillingSecretCache,
} from 'src/engine/core-modules/growth-os/growth-os.config';
import { buildBillingPortalLink } from 'src/engine/core-modules/growth-os/utils/billing-portal-link.util';
import { signGrowthOsPayload } from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';

const SECRET_KEYS = [
  'MODULE_CRM_WEBHOOK_SECRET',
  'MODULE_CRM_WEBHOOK_SECRET_FILE',
  'GROWTH_OS_BILLING_WEBHOOK_SECRET',
  'GROWTH_OS_BILLING_SECRET',
  'GROWTH_OS_BILLING_SECRET_FILE',
];

describe('module secret from a file or env', () => {
  const saved: Record<string, string | undefined> = {};
  const dir = mkdtempSync(join(tmpdir(), 'gos-secret-'));

  beforeEach(() => {
    SECRET_KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; });
    resetGrowthOsBillingSecretCache();
  });
  afterEach(() => {
    SECRET_KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
    resetGrowthOsBillingSecretCache();
  });

  const secretFile = (content: string, mode = 0o600) => {
    const file = join(dir, `s-${Math.random().toString(36).slice(2)}`);

    writeFileSync(file, content);
    chmodSync(file, mode);

    return file;
  };

  it('reads MODULE_CRM_WEBHOOK_SECRET_FILE and trims the trailing newline', () => {
    process.env.MODULE_CRM_WEBHOOK_SECRET_FILE = secretFile('file-secret-value\n');
    expect(getGrowthOsConfig().webhookSecret).toBe('file-secret-value');
  });

  it('accepts GROWTH_OS_BILLING_SECRET_FILE and the env names', () => {
    process.env.GROWTH_OS_BILLING_SECRET_FILE = secretFile('alias-file');
    expect(getGrowthOsConfig().webhookSecret).toBe('alias-file');
    delete process.env.GROWTH_OS_BILLING_SECRET_FILE;
    resetGrowthOsBillingSecretCache();
    process.env.MODULE_CRM_WEBHOOK_SECRET = 'env-secret';
    expect(getGrowthOsConfig().webhookSecret).toBe('env-secret');
  });

  it('a configured file wins over env and a bad file fails closed (no env fallback)', () => {
    process.env.MODULE_CRM_WEBHOOK_SECRET = 'env-secret';
    process.env.MODULE_CRM_WEBHOOK_SECRET_FILE = secretFile('file-secret');
    expect(getGrowthOsConfig().webhookSecret).toBe('file-secret');
    resetGrowthOsBillingSecretCache();
    process.env.MODULE_CRM_WEBHOOK_SECRET_FILE = join(dir, 'does-not-exist');
    expect(getGrowthOsConfig().webhookSecret).toBeUndefined();
    resetGrowthOsBillingSecretCache();
    process.env.MODULE_CRM_WEBHOOK_SECRET_FILE = secretFile('  \n');
    expect(getGrowthOsConfig().webhookSecret).toBeUndefined();
  });

  it('warns about a loose file mode without printing the secret', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    process.env.MODULE_CRM_WEBHOOK_SECRET_FILE = secretFile('loose-mode-secret', 0o644);
    expect(getGrowthOsConfig().webhookSecret).toBe('loose-mode-secret');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('expected 600');
    expect(String(warn.mock.calls[0][0])).not.toContain('loose-mode-secret');
    warn.mockRestore();
  });

  it('signs portal links and API calls with the file secret', () => {
    process.env.MODULE_CRM_WEBHOOK_SECRET_FILE = secretFile('portal-file-secret');
    const url = new URL(buildBillingPortalLink('acc_1', { base: 'https://b.example.test', nowSeconds: 10 }));

    expect(url.searchParams.get('sig')).toMatch(/^[0-9a-f]{64}$/);
    expect(new GrowthOsBillingClient().isLive()).toBe(false); // provider still mock
  });
});

// In-memory stand-in for the core database: two workspaces, nothing else.
const makeFakeDataSource = (workspaceIds: string[]) => {
  const rows = new Map<string, Record<string, unknown>>();
  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('SELECT 1 FROM core."workspace"')) return workspaceIds.includes(String(params[0])) ? [{}] : [];
    if (sql.includes('SELECT "createdAt" FROM core."workspace"')) return [{ createdAt: new Date('2026-11-01T00:00:00Z') }];
    if (sql.includes('SELECT * FROM core."growthOsPlanEntitlement"')) {
      const row = rows.get(String(params[0]));

      return row ? [row] : [];
    }
    if (sql.includes('INSERT INTO core."growthOsPlanEntitlement"')) {
      const [workspaceId, plan, status, seats, interval, trialEndsAt, currentPeriodEnd, statusChangedAt, customerRef, featureOverrides, aiMonthlyCap, lastEventId, lastEventAt, , version, readOnly, graceUntil, cancelAtPeriodEnd, lookupKey] = params;

      rows.set(String(workspaceId), { workspaceId, plan, status, seats, interval, trialEndsAt, currentPeriodEnd, statusChangedAt, customerRef, featureOverrides, aiMonthlyCap, aiUsageCount: 0, aiUsagePeriod: null, lastEventId, lastEventAt, version, readOnly, graceUntil, cancelAtPeriodEnd, lookupKey });

      return [];
    }

    return [];
  });

  return { query, rows };
};

describe('one webhook URL for every workspace', () => {
  const SECRET = 'two-workspace-test-secret';
  const WS_A = '11111111-1111-4111-8111-111111111111';
  const WS_B = '22222222-2222-4222-8222-222222222222';
  const saved = process.env.MODULE_CRM_WEBHOOK_SECRET;

  beforeAll(() => { process.env.MODULE_CRM_WEBHOOK_SECRET = SECRET; resetGrowthOsBillingSecretCache(); });
  afterAll(() => { if (saved === undefined) delete process.env.MODULE_CRM_WEBHOOK_SECRET; else process.env.MODULE_CRM_WEBHOOK_SECRET = saved; resetGrowthOsBillingSecretCache(); });

  const setup = () => {
    const ds = makeFakeDataSource([WS_A, WS_B]);
    const entitlements = new GrowthOsEntitlementService(ds as never, { pushSeatCount: jest.fn() } as never);
    const controller = new GrowthOsBillingWebhookController(entitlements);

    return { ds, entitlements, controller };
  };
  const push = (controller: GrowthOsBillingWebhookController, workspaceId: string, host: string | undefined, data: Record<string, unknown>, version: number) => {
    const body = JSON.stringify({ id: `evt_${workspaceId.slice(0, 4)}_${version}`, type: 'entitlement.updated', version, createdAt: '2026-11-20T10:00:00Z', data: { workspaceId, interval: 'month', ...data } });
    const req = { rawBody: Buffer.from(body), headers: { 'x-growth-os-signature': signGrowthOsPayload(SECRET, body), ...(host ? { host } : {}) } };

    return controller.handle(req as never);
  };

  it('applies each event to the workspace named in the event, whatever host it arrives on', async () => {
    const { controller, entitlements } = setup();

    // Both events come in on the single registered host.
    const a = await push(controller, WS_A, 'crm.scalepoint-ventures.com', { plan: 'growth', status: 'active', seats: 5 }, 1);
    const b = await push(controller, WS_B, 'crm.scalepoint-ventures.com', { plan: 'scale', status: 'past_due', seats: 9, readOnly: false }, 1);

    expect(a).toMatchObject({ workspaceId: WS_A, effectivePlan: 'growth', status: 'active', seatsAllowed: 5, result: 'applied' });
    expect(b).toMatchObject({ workspaceId: WS_B, effectivePlan: 'scale', status: 'past_due', seatsAllowed: 9, result: 'applied' });

    // An event for B delivered on A's workspace host (or no host) still lands on B and leaves A alone.
    await push(controller, WS_B, `a.crm.scalepoint-ventures.com`, { plan: 'scale', status: 'canceled', seats: 9, readOnly: true }, 2);
    await push(controller, WS_A, undefined, { plan: 'growth', status: 'active', seats: 7 }, 2);

    const ea = await entitlements.getEntitlement(WS_A, { skipCache: true });
    const eb = await entitlements.getEntitlement(WS_B, { skipCache: true });

    expect(ea).toMatchObject({ status: 'active', seatsAllowed: 7, isReadOnly: false });
    expect(eb).toMatchObject({ status: 'canceled', effectivePlan: 'starter', isReadOnly: true });
  });

  it('a stale version for one workspace does not touch the other, and unknown workspaces get 404', async () => {
    const { controller, entitlements } = setup();

    await push(controller, WS_A, 'crm.scalepoint-ventures.com', { plan: 'growth', status: 'active', seats: 5 }, 5);
    await push(controller, WS_B, 'crm.scalepoint-ventures.com', { plan: 'starter', status: 'active', seats: 3 }, 1);
    const stale = await push(controller, WS_A, 'crm.scalepoint-ventures.com', { plan: 'starter', status: 'canceled' }, 4);

    expect(stale.result).toBe('stale');
    expect((await entitlements.getEntitlement(WS_A, { skipCache: true })).status).toBe('active');
    expect((await entitlements.getEntitlement(WS_B, { skipCache: true })).effectivePlan).toBe('starter');
    await expect(push(controller, '33333333-3333-4333-8333-333333333333', 'crm.scalepoint-ventures.com', { plan: 'growth', status: 'active' }, 1)).rejects.toThrow('Unknown workspace');
  });
});

describe('the CRM sends no billing mail', () => {
  const dir = join(__dirname, '..');
  const billingSources = ['growth-os-billing-webhook.controller.ts', 'growth-os-billing.service.ts', 'growth-os-billing.client.ts', 'growth-os-entitlement.service.ts', 'growth-os-plan.resolver.ts'];

  it('billing code has no mail dependency (no EmailService, no mail rendering, no billing templates)', () => {
    for (const file of billingSources) {
      const source = readFileSync(join(dir, file), 'utf8');

      expect(source).not.toMatch(/EmailService|EmailSenderService|renderEmail|from 'twenty-emails'|emailService\.send/);
    }
    expect(readdirSync(dir).filter((f) => /mail/i.test(f) && /billing/i.test(f))).toEqual([]);
  });

  it('payment-failed, cancellation and period-end pushes only change state (no sender exists to call)', async () => {
    const WS = '44444444-4444-4444-8444-444444444444';
    const SECRET = 'no-mail-secret';
    const saved = process.env.MODULE_CRM_WEBHOOK_SECRET;

    process.env.MODULE_CRM_WEBHOOK_SECRET = SECRET;
    resetGrowthOsBillingSecretCache();
    const ds = makeFakeDataSource([WS]);
    const entitlements = new GrowthOsEntitlementService(ds as never, { pushSeatCount: jest.fn() } as never);
    // The controller's only collaborator is the entitlement service: there is nothing that could send mail.
    const controller = new GrowthOsBillingWebhookController(entitlements);

    expect(Object.keys(controller as object)).toEqual(['growthOsEntitlementService']);
    for (const [version, data] of [[1, { status: 'past_due', readOnly: false }], [2, { status: 'active', cancelAtPeriodEnd: true }], [3, { status: 'canceled', readOnly: true }]] as const) {
      const body = JSON.stringify({ id: `e${version}`, type: 'entitlement.updated', version, createdAt: '2026-11-20T10:00:00Z', data: { workspaceId: WS, plan: 'growth', interval: 'month', seats: 3, ...data } });
      const res = await controller.handle({ rawBody: Buffer.from(body), headers: { 'x-growth-os-signature': signGrowthOsPayload(SECRET, body) } } as never);

      expect(res.result).toBe('applied');
    }
    expect((await entitlements.getEntitlement(WS, { skipCache: true })).isReadOnly).toBe(true);
    if (saved === undefined) delete process.env.MODULE_CRM_WEBHOOK_SECRET; else process.env.MODULE_CRM_WEBHOOK_SECRET = saved;
    resetGrowthOsBillingSecretCache();
  });
});

describe('checkout carries the success url on the workspace host', () => {
  it('posts success_url=<workspace host>/settings/billing?checkout=success and a cancel_url', async () => {
    const request = jest.fn(async () => ({ url: 'https://billing.example.test/c/1', mode: 'checkout' }));
    const client = { isLive: () => true, request, getMockSessionUrl: jest.fn() } as unknown as GrowthOsBillingClient;
    const entitlements = {
      getBillingAccount: jest.fn(async () => ({ accountId: 'acc_1', email: 'a@b.example', locale: 'de', workspaceId: 'w' })),
    } as unknown as GrowthOsEntitlementService;
    const service = new GrowthOsBillingService(client, entitlements);

    const url = await service.getSessionUrl({ kind: 'checkout', workspaceId: 'w', plan: 'growth', interval: 'month', seats: 3, returnUrl: 'https://spv.crm.scalepoint-ventures.com/settings/billing?x=1' });

    expect(url).toBe('https://billing.example.test/c/1');
    expect(request).toHaveBeenCalledWith('POST', '/v1/checkout-sessions', expect.objectContaining({
      price_lookup_key: 'crm_growth_m',
      quantity: 3,
      success_url: 'https://spv.crm.scalepoint-ventures.com/settings/billing?checkout=success',
      cancel_url: 'https://spv.crm.scalepoint-ventures.com/settings/billing?x=1',
    }));
  });
});

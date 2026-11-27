import { createHmac } from 'crypto';

import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { assertSafeBillingBaseUrl } from 'src/engine/core-modules/growth-os/growth-os-billing.client';
import { resolveBillingReturnUrl } from 'src/engine/core-modules/growth-os/growth-os-billing.service';
import { buildBillingPortalLink } from 'src/engine/core-modules/growth-os/utils/billing-portal-link.util';
import { computeEffectiveEntitlement } from 'src/engine/core-modules/growth-os/utils/compute-effective-entitlement.util';
import {
  pickGrowthOsSignatureHeader,
  signGrowthOsPayload,
  verifyGrowthOsSignature,
} from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';
import { parseGrowthOsEntitlementEvent } from 'src/engine/core-modules/growth-os/utils/parse-growth-os-entitlement-event.util';

// Vectors computed independently with the billing service's own formula
// (python: hmac.new(secret, f"{t}.".encode() + body, sha256).hexdigest()).
const SECRET = 'unit-test-crm-secret';
const BODY = '{"id":"evt_1","type":"entitlement.updated","version":3}';
const T = 1_900_000_000;
const VECTOR = '3ec340f56aff7802da3a79ebb4649162532fa14adee6b905a504485955ef73ed';
const EMPTY_VECTOR = 'edda7e7b89b9ef99437acef0e59aac4bec880f0fc8fa50ecb104db3956f3b524';
const WS = '20202020-1c25-4d02-bf25-6aeccf7ea419';

describe('growth-os-billing signature (both header styles)', () => {
  it('signs exactly like the billing service (t=<unix>,v1=HMAC("<t>.<body>"))', () => {
    expect(signGrowthOsPayload(SECRET, BODY, T)).toBe(`t=${T},v1=${VECTOR}`);
    // a GET signs the empty body
    expect(signGrowthOsPayload(SECRET, '', T)).toBe(`t=${T},v1=${EMPTY_VECTOR}`);
  });

  it('verifies the X-Growth-OS-Signature style', () => {
    expect(
      verifyGrowthOsSignature({ secret: SECRET, rawBody: BODY, header: `t=${T},v1=${VECTOR}`, nowSeconds: T + 10 }),
    ).toEqual({ ok: true });
  });

  it('verifies the X-GOS-Timestamp + X-GOS-Signature style', () => {
    const header = pickGrowthOsSignatureHeader({
      'x-gos-timestamp': String(T),
      'x-gos-signature': `v1=${VECTOR}`,
    });

    expect(header).toBe(`t=${T},v1=${VECTOR}`);
    expect(verifyGrowthOsSignature({ secret: SECRET, rawBody: BODY, header, nowSeconds: T })).toEqual({ ok: true });
  });

  it('prefers the first style when a push carries both', () => {
    expect(
      pickGrowthOsSignatureHeader({
        'x-growth-os-signature': `t=${T},v1=${VECTOR}`,
        'x-gos-timestamp': String(T),
        'x-gos-signature': 'v1=ignored',
      }),
    ).toBe(`t=${T},v1=${VECTOR}`);
  });

  it('returns nothing for a missing or malformed second style', () => {
    expect(pickGrowthOsSignatureHeader({})).toBeUndefined();
    expect(pickGrowthOsSignatureHeader({ 'x-gos-timestamp': String(T), 'x-gos-signature': VECTOR })).toBeUndefined();
  });

  it.each([
    ['wrong secret', { secret: 'other' }],
    ['tampered body', { rawBody: `${BODY} ` }],
    ['timestamp 301 s old', { nowSeconds: T + 301 }],
    ['timestamp 301 s in the future', { nowSeconds: T - 301 }],
    ['no secret configured', { secret: undefined }],
    ['signature of another timestamp', { header: `t=${T + 1},v1=${VECTOR}` }],
    ['malformed header', { header: 'v1=abc' }],
    ['non-hex signature', { header: `t=${T},v1=zzzz` }],
  ])('rejects %s', (_label, override) => {
    const result = verifyGrowthOsSignature({
      secret: SECRET,
      rawBody: BODY,
      header: `t=${T},v1=${VECTOR}`,
      nowSeconds: T,
      ...override,
    } as Parameters<typeof verifyGrowthOsSignature>[0]);

    expect(result.ok).toBe(false);
  });

  it('accepts the 300 s tolerance edge', () => {
    expect(
      verifyGrowthOsSignature({ secret: SECRET, rawBody: BODY, header: `t=${T},v1=${VECTOR}`, nowSeconds: T + 300 }).ok,
    ).toBe(true);
  });
});

describe('signed /portal link', () => {
  it('matches the documented test vector', () => {
    const link = buildBillingPortalLink('acc_1', {
      module: 'connect',
      secret: 'unit-test-connect-secret',
      base: 'https://billing.scalepoint-ventures.com',
      nowSeconds: 2_000_000_000 - 7 * 86400,
    });
    const url = new URL(link);

    expect(url.origin + url.pathname).toBe('https://billing.scalepoint-ventures.com/portal');
    expect(url.searchParams.get('sig')).toBe('8f9447d0fb3a84b42e10210ccd4d6cd1096cd4674d2a4805258fc4ad748a4deb');
  });

  it('signs "portal.crm.<account>.<exp>" with the module secret and expires in 7 days', () => {
    const url = new URL(buildBillingPortalLink('acc_9', { secret: SECRET, base: 'https://billing.example.test', nowSeconds: 1_000 }));
    const exp = Number(url.searchParams.get('exp'));

    expect(url.searchParams.get('m')).toBe('crm');
    expect(url.searchParams.get('a')).toBe('acc_9');
    expect(exp).toBe(1_000 + 7 * 86400);
    expect(url.searchParams.get('sig')).toBe(createHmac('sha256', SECRET).update(`portal.crm.acc_9.${exp}`).digest('hex'));
    expect(url.toString()).not.toContain(SECRET);
  });
});

describe('push payload with version and read-only fields', () => {
  const event = (data: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      id: 'evt_gos_acc_1_7',
      type: 'entitlement.updated',
      version: 7,
      createdAt: '2026-11-20T10:00:00Z',
      data: { workspaceId: WS, plan: 'growth', status: 'past_due', seats: 5, interval: 'month', ...data },
      ...extra,
    });

  it('parses version, readOnly, graceUntil, cancelAtPeriodEnd and lookupKey', () => {
    const parsed = parseGrowthOsEntitlementEvent(
      event({ readOnly: false, graceUntil: '2026-11-27T10:00:00Z', cancelAtPeriodEnd: false, lookupKey: 'crm_growth_m' }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.update).toMatchObject({ version: 7, readOnly: false, cancelAtPeriodEnd: false, lookupKey: 'crm_growth_m' });
      expect(parsed.update.graceUntil?.toISOString()).toBe('2026-11-27T10:00:00.000Z');
    }
  });

  it('keeps working for older senders without the new fields', () => {
    const parsed = parseGrowthOsEntitlementEvent(
      JSON.stringify({ id: 'e', type: 'entitlement.updated', createdAt: '2026-11-20T10:00:00Z', data: { workspaceId: WS, plan: 'starter', status: 'active' } }),
    );

    expect(parsed.ok && parsed.update).toMatchObject({ version: null, readOnly: null, graceUntil: null, cancelAtPeriodEnd: null });
  });
});

describe('entitlement from service state', () => {
  const base = {
    workspaceId: WS,
    workspaceCreatedAt: new Date('2026-11-01T00:00:00Z'),
    unpaidAccess: 'read_only' as const,
    aiMonthlyCap: 500,
  };
  const row = (o: Record<string, unknown>) => ({
    workspaceId: WS, plan: 'growth' as const, status: 'active' as const, seats: 10, interval: 'month' as const,
    trialEndsAt: null, currentPeriodEnd: null, statusChangedAt: null, featureOverrides: null,
    aiMonthlyCap: null, aiUsageCount: 0, aiUsagePeriod: null, ...o,
  });

  it('treats readOnly:true as authoritative even inside the local grace window', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-12T00:00:00Z'), stored: row({ status: 'past_due', statusChangedAt: new Date('2026-11-11T00:00:00Z'), readOnly: true }) });

    expect(e.isReadOnly).toBe(true);
  });

  it('follows the service grace date instead of the local 7-day clock', () => {
    const stored = row({ status: 'past_due', statusChangedAt: new Date('2026-11-01T00:00:00Z'), graceUntil: new Date('2026-11-20T00:00:00Z'), readOnly: false });
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-15T00:00:00Z'), stored });

    expect(e.graceEndsAt?.toISOString()).toBe('2026-11-20T00:00:00.000Z');
    expect(e.isReadOnly).toBe(false);
  });

  it('keeps the paid plan until period end when the cancel is scheduled', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-12T00:00:00Z'), stored: row({ cancelAtPeriodEnd: true, currentPeriodEnd: new Date('2026-11-30T00:00:00Z'), readOnly: false }) });

    expect(e.status).toBe('active');
    expect(e.effectivePlan).toBe('growth');
    expect(e.cancelAtPeriodEnd).toBe(true);
    expect(e.isReadOnly).toBe(false);
  });

  it('read-only canceled workspace keeps reading (flag only blocks writes)', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-12-10T00:00:00Z'), stored: row({ status: 'canceled', plan: 'growth', statusChangedAt: new Date('2026-11-30T00:00:00Z'), readOnly: true }) });

    expect(e.isReadOnly).toBe(true);
    expect(e.effectivePlan).toBe('starter');
  });
});

describe('version ordering of pushes', () => {
  const makeService = (storedVersion: number | null) => {
    const queries: string[] = [];
    const dataSource = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('SELECT * FROM')) {
          return [{ workspaceId: WS, status: 'active', version: storedVersion, lastEventId: 'evt_old', lastEventAt: new Date('2026-11-20T10:00:00Z'), statusChangedAt: null }];
        }

        return [];
      }),
    };
    const service = new GrowthOsEntitlementService(dataSource as never, { pushSeatCount: jest.fn() } as never);

    return { service, queries };
  };
  const update = (version: number | null, eventId: string, createdAt = '2026-11-20T10:00:00Z') => {
    const parsed = parseGrowthOsEntitlementEvent(
      JSON.stringify({ id: eventId, type: 'entitlement.updated', ...(version === null ? {} : { version }), createdAt, data: { workspaceId: WS, plan: 'growth', status: 'active' } }),
    );

    if (!parsed.ok) throw new Error('bad fixture');

    return parsed.update;
  };

  it('ignores a push with a lower version, even if it is newer by time', async () => {
    const { service } = makeService(5);

    expect(await service.applyUpdate(update(4, 'evt_4', '2026-11-25T00:00:00Z'))).toBe('stale');
  });

  it('applies equal and higher versions, ignores a replay of the same event id', async () => {
    const { service } = makeService(5);

    expect(await service.applyUpdate(update(6, 'evt_6'))).toBe('applied');
    expect(await service.applyUpdate(update(5, 'evt_5b'))).toBe('applied');
    expect(await service.applyUpdate(update(6, 'evt_old'))).toBe('duplicate');
  });
});

describe('transport and return-url safety', () => {
  it('requires https (http only for loopback stubs)', () => {
    expect(assertSafeBillingBaseUrl('https://billing.scalepoint-ventures.com/')).toBe('https://billing.scalepoint-ventures.com');
    expect(assertSafeBillingBaseUrl('http://127.0.0.1:4010')).toBe('http://127.0.0.1:4010');
    expect(() => assertSafeBillingBaseUrl('http://billing.scalepoint-ventures.com')).toThrow();
  });

  it('limits return urls to the CRM host and its workspace subdomains', () => {
    const fallback = 'https://crm.scalepoint-ventures.com/settings/billing';

    expect(resolveBillingReturnUrl('https://spv.crm.scalepoint-ventures.com/settings/billing')).toBe('https://spv.crm.scalepoint-ventures.com/settings/billing');
    expect(resolveBillingReturnUrl('https://crm.scalepoint-ventures.com/x')).toBe('https://crm.scalepoint-ventures.com/x');
    expect(resolveBillingReturnUrl('https://scalepoint-ventures.com/x')).toBe(fallback);
    expect(resolveBillingReturnUrl('https://evil.example.com/x')).toBe(fallback);
    expect(resolveBillingReturnUrl('https://crm.scalepoint-ventures.com.evil.com/')).toBe(fallback);
    expect(resolveBillingReturnUrl('javascript:alert(1)')).toBe(fallback);
    expect(resolveBillingReturnUrl(undefined)).toBe(fallback);
  });
});

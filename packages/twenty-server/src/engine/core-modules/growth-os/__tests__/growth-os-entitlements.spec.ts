import { computeEffectiveEntitlement } from 'src/engine/core-modules/growth-os/utils/compute-effective-entitlement.util';
import { parseGrowthOsEntitlementEvent } from 'src/engine/core-modules/growth-os/utils/parse-growth-os-entitlement-event.util';
import {
  signGrowthOsPayload,
  verifyGrowthOsSignature,
} from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';

const DAY = 24 * 60 * 60 * 1000;
const WS = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const created = new Date('2026-11-01T00:00:00Z');

const base = {
  workspaceId: WS,
  workspaceCreatedAt: created,
  unpaidAccess: 'read_only' as const,
  aiMonthlyCap: 500,
};

const stored = (overrides: Record<string, unknown>) => ({
  workspaceId: WS,
  plan: 'growth' as const,
  status: 'active' as const,
  seats: 10,
  interval: 'month' as const,
  trialEndsAt: null,
  currentPeriodEnd: null,
  statusChangedAt: null,
  featureOverrides: null,
  aiMonthlyCap: null,
  aiUsageCount: 0,
  aiUsagePeriod: null,
  ...overrides,
});

describe('Growth OS entitlements', () => {
  it('starts a brand-new workspace in a 14-day Growth trial without billing', () => {
    const e = computeEffectiveEntitlement({
      ...base,
      stored: null,
      now: new Date(created.getTime() + 3 * DAY),
    });

    expect(e.status).toBe('trialing');
    expect(e.effectivePlan).toBe('growth');
    expect(e.trialDaysLeft).toBe(11);
    expect(e.features.workflows).toBe(true);
    expect(e.features.ai).toBe(false);
    expect(e.seatsAllowed).toBe(25);
  });

  it('defaults to Starter after the trial, then read-only after the 7-day grace', () => {
    const inGrace = computeEffectiveEntitlement({
      ...base,
      stored: null,
      now: new Date(created.getTime() + 16 * DAY),
    });

    expect(inGrace.status).toBe('trial_expired');
    expect(inGrace.effectivePlan).toBe('starter');
    expect(inGrace.features.emailCalendarSync).toBe(false);
    expect(inGrace.features.workflows).toBe(false);
    expect(inGrace.maxPipelines).toBe(1);
    expect(inGrace.seatsAllowed).toBe(3);
    expect(inGrace.isReadOnly).toBe(false);

    const afterGrace = computeEffectiveEntitlement({
      ...base,
      stored: null,
      now: new Date(created.getTime() + 22 * DAY),
    });

    expect(afterGrace.isReadOnly).toBe(true);

    const starterMode = computeEffectiveEntitlement({
      ...base,
      unpaidAccess: 'starter',
      stored: null,
      now: new Date(created.getTime() + 22 * DAY),
    });

    expect(starterMode.isReadOnly).toBe(false);
  });

  it('applies the purchased seat count, capped by the plan', () => {
    const growth = computeEffectiveEntitlement({
      ...base,
      stored: stored({ seats: 40 }),
      now: new Date(),
    });

    expect(growth.seatsAllowed).toBe(25);

    const scale = computeEffectiveEntitlement({
      ...base,
      stored: stored({ plan: 'scale', seats: 40 }),
      now: new Date(),
    });

    expect(scale.seatsAllowed).toBe(40);
    expect(scale.features.ai).toBe(true);
    expect(scale.apiRequestsPerMinute).toBeGreaterThan(
      growth.apiRequestsPerMinute,
    );
  });

  it('keeps the plan for 7 days when past_due, then becomes read-only', () => {
    const since = new Date('2026-11-10T00:00:00Z');
    const graceDay = computeEffectiveEntitlement({
      ...base,
      stored: stored({ status: 'past_due', statusChangedAt: since }),
      now: new Date(since.getTime() + 6 * DAY),
    });

    expect(graceDay.effectivePlan).toBe('growth');
    expect(graceDay.isReadOnly).toBe(false);

    const late = computeEffectiveEntitlement({
      ...base,
      stored: stored({ status: 'past_due', statusChangedAt: since }),
      now: new Date(since.getTime() + 8 * DAY),
    });

    expect(late.isReadOnly).toBe(true);
  });

  it('pauses paid features on cancel (Starter limits) without deleting anything', () => {
    const e = computeEffectiveEntitlement({
      ...base,
      stored: stored({ status: 'canceled', statusChangedAt: new Date() }),
      now: new Date(),
    });

    expect(e.effectivePlan).toBe('starter');
    expect(e.features.api).toBe(false);
    expect(e.isReadOnly).toBe(false);
  });
});

describe('Growth OS webhook signature', () => {
  const secret = 'test-secret';
  const body = JSON.stringify({ hello: 'world' });

  it('accepts a valid signature', () => {
    const header = signGrowthOsPayload(secret, body, 1_000);

    expect(
      verifyGrowthOsSignature({ secret, rawBody: body, header, nowSeconds: 1_010 }),
    ).toEqual({ ok: true });
  });

  it('rejects a wrong secret, a tampered body, an old timestamp and a missing secret', () => {
    const header = signGrowthOsPayload(secret, body, 1_000);

    expect(
      verifyGrowthOsSignature({ secret: 'other', rawBody: body, header, nowSeconds: 1_000 }).ok,
    ).toBe(false);
    expect(
      verifyGrowthOsSignature({ secret, rawBody: body + ' ', header, nowSeconds: 1_000 }).ok,
    ).toBe(false);
    expect(
      verifyGrowthOsSignature({ secret, rawBody: body, header, nowSeconds: 2_000 }).ok,
    ).toBe(false);
    expect(
      verifyGrowthOsSignature({ secret: undefined, rawBody: body, header }).ok,
    ).toBe(false);
  });
});

describe('Growth OS entitlement event parser', () => {
  it('parses a valid entitlement.updated event', () => {
    const parsed = parseGrowthOsEntitlementEvent(
      JSON.stringify({
        id: 'evt_1',
        type: 'entitlement.updated',
        createdAt: '2026-11-25T10:00:00Z',
        data: { workspaceId: WS, plan: 'growth', status: 'active', seats: 5, interval: 'year' },
      }),
    );

    expect(parsed.ok).toBe(true);
  });

  it('rejects unknown plans and event types', () => {
    expect(
      parseGrowthOsEntitlementEvent(
        JSON.stringify({ id: 'e', type: 'entitlement.updated', data: { workspaceId: WS, plan: 'gold', status: 'active' } }),
      ).ok,
    ).toBe(false);
    expect(
      parseGrowthOsEntitlementEvent(JSON.stringify({ id: 'e', type: 'invoice.paid' })).ok,
    ).toBe(false);
  });
});

import { computeEffectiveEntitlement } from 'src/engine/core-modules/growth-os/utils/compute-effective-entitlement.util';
import { parseGrowthOsEntitlementEvent } from 'src/engine/core-modules/growth-os/utils/parse-growth-os-entitlement-event.util';

const WS = '66666666-6666-4666-8666-666666666666';
const base = { workspaceId: WS, workspaceCreatedAt: new Date('2026-11-01T00:00:00Z'), unpaidAccess: 'read_only' as const, aiMonthlyCap: 500 };
const row = (o: Record<string, unknown>) => ({
  workspaceId: WS, plan: 'growth' as const, status: 'trialing' as const, seats: null, interval: null,
  trialEndsAt: new Date('2026-11-15T00:00:00Z'), currentPeriodEnd: null, statusChangedAt: null, featureOverrides: null,
  aiMonthlyCap: null, aiUsageCount: 0, aiUsagePeriod: null, lookupKey: null, ...o,
});
const event = (data: Record<string, unknown>, version = 1) =>
  JSON.stringify({ id: `evt_${version}`, type: 'entitlement.updated', version, createdAt: '2026-11-10T00:00:00Z', data: { workspaceId: WS, plan: 'growth', ...data } });

describe('trial pushes of the billing service', () => {
  it('card-free trial: trialing, trial plan, lookupKey null, seats null, trialEndsAt set', () => {
    const parsed = parseGrowthOsEntitlementEvent(event({ status: 'trialing', lookupKey: null, seats: null, interval: null, trialEndsAt: '2026-11-15T00:00:00Z' }));

    expect(parsed.ok && parsed.update).toMatchObject({ status: 'trialing', plan: 'growth', lookupKey: null, seats: null, trialEndsAt: new Date('2026-11-15T00:00:00Z') });
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-05T00:00:00Z'), stored: row({}) });

    expect(e).toMatchObject({ status: 'trialing', isTrial: true, hasSubscription: false, seatsPurchased: null, seatsAllowed: 25, trialDaysLeft: 10 });
  });

  it('bought during the trial: trialing + lookupKey, plan, seats, interval, trial end, period end', () => {
    const parsed = parseGrowthOsEntitlementEvent(event({ status: 'trialing', lookupKey: 'crm_scale_y', plan: 'scale', seats: 12, interval: 'year', trialEndsAt: '2026-11-15T00:00:00Z', currentPeriodEnd: '2026-11-15T00:00:00Z' }));

    expect(parsed.ok && parsed.update).toMatchObject({ status: 'trialing', lookupKey: 'crm_scale_y', plan: 'scale', seats: 12, interval: 'year' });
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-05T00:00:00Z'), stored: row({ plan: 'scale', seats: 12, interval: 'year', lookupKey: 'crm_scale_y', currentPeriodEnd: new Date('2026-11-15T00:00:00Z') }) });

    expect(e).toMatchObject({ status: 'trialing', hasSubscription: true, effectivePlan: 'scale', seatsAllowed: 12, interval: 'year' });
  });

  it('first payment: active with trialEndsAt null, no trial state any more', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-16T00:00:00Z'), stored: row({ status: 'active', trialEndsAt: null, seats: 5, lookupKey: 'crm_growth_m', interval: 'month' }) });

    expect(e).toMatchObject({ status: 'active', isTrial: false, trialEndsAt: null, hasSubscription: false, trialDaysLeft: null, seatsAllowed: 5 });
  });

  it('edge 1: bought with <= 2 days + 1 h left means active at once (no "billing starts" state)', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-13T00:00:00Z'), stored: row({ status: 'active', trialEndsAt: null, seats: 3, lookupKey: 'crm_growth_m' }) });

    expect(e.hasSubscription).toBe(false);
    expect(e.isTrial).toBe(false);
  });
});

describe('expired card-free trial (service keeps pushing status trialing)', () => {
  const expired = { trialEndsAt: new Date('2026-11-15T00:00:00Z'), graceUntil: new Date('2026-11-22T00:00:00Z'), readOnly: false };

  it('trialEndsAt in the past is expired, never an active trial; Starter limits during the grace', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-18T00:00:00Z'), stored: row(expired) });

    expect(e).toMatchObject({ status: 'trial_expired', isTrial: false, effectivePlan: 'starter', trialDaysLeft: null, isReadOnly: false, hasSubscription: false });
    expect(e.graceEndsAt?.toISOString()).toBe('2026-11-22T00:00:00.000Z'); // the service's date, not trial end + 7 d
  });

  it('follows the service graceUntil when it differs from trial end + 7 days', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-23T00:00:00Z'), stored: row({ ...expired, graceUntil: new Date('2026-11-30T00:00:00Z') }) });

    expect(e.graceEndsAt?.toISOString()).toBe('2026-11-30T00:00:00.000Z');
    expect(e.isReadOnly).toBe(false);
  });

  it('past the service grace date without a push yet: read-only (fail closed)', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-22T00:00:01Z'), stored: row(expired) });

    expect(e).toMatchObject({ status: 'trial_expired', isReadOnly: true });
  });

  it('after the grace the service pushes canceled + readOnly: read-only, Starter limits, not a trial', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-23T00:00:00Z'), stored: row({ ...expired, status: 'canceled', readOnly: true }) });

    expect(e).toMatchObject({ status: 'canceled', isReadOnly: true, isTrial: false, effectivePlan: 'starter' });
  });

  it('a readOnly:true flag on an expired trial push wins even inside the grace date', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-18T00:00:00Z'), stored: row({ ...expired, readOnly: true }) });

    expect(e.isReadOnly).toBe(true);
  });

  it('reactivation: checkout payment pushes active, lifts read-only and the grace', () => {
    const e = computeEffectiveEntitlement({ ...base, now: new Date('2026-11-25T00:00:00Z'), stored: row({ status: 'active', trialEndsAt: null, graceUntil: null, readOnly: false, seats: 4, lookupKey: 'crm_growth_m' }) });

    expect(e).toMatchObject({ status: 'active', isReadOnly: false, seatsAllowed: 4, graceEndsAt: null });
  });
});

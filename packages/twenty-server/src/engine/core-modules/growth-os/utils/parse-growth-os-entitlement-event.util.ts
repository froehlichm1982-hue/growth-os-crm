import { type GrowthOsEntitlementUpdate } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import {
  GROWTH_OS_FEATURES,
  isGrowthOsPlan,
  type GrowthOsBillingStatus,
  type GrowthOsFeature,
} from 'src/engine/core-modules/growth-os/growth-os-plan.constants';

const STATUSES: GrowthOsBillingStatus[] = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toDate = (value: unknown): Date | null | 'invalid' => {
  if (value === null || value === undefined) return null;
  const date = new Date(value as string);

  return Number.isNaN(date.getTime()) ? 'invalid' : date;
};

export const parseGrowthOsEntitlementEvent = (
  rawBody: string,
): { ok: true; update: GrowthOsEntitlementUpdate } | { ok: false; error: string } => {
  // oxlint-disable-next-line typescript/no-explicit-any
  let event: any;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: 'Body is not JSON' };
  }

  if (event?.type !== 'entitlement.updated') {
    return { ok: false, error: `Unsupported event type ${event?.type}` };
  }
  if (typeof event.id !== 'string' || event.id.length === 0) {
    return { ok: false, error: 'Missing event id' };
  }

  const data = event.data ?? {};

  if (typeof data.workspaceId !== 'string' || !UUID.test(data.workspaceId)) {
    return { ok: false, error: 'data.workspaceId must be a UUID' };
  }
  if (!isGrowthOsPlan(data.plan)) {
    return { ok: false, error: 'data.plan must be starter|growth|scale' };
  }
  if (!STATUSES.includes(data.status)) {
    return { ok: false, error: `data.status must be one of ${STATUSES.join('|')}` };
  }
  if (
    data.seats !== undefined &&
    data.seats !== null &&
    !(Number.isInteger(data.seats) && data.seats > 0)
  ) {
    return { ok: false, error: 'data.seats must be a positive integer or null' };
  }
  if (
    data.interval !== undefined &&
    data.interval !== null &&
    data.interval !== 'month' &&
    data.interval !== 'year'
  ) {
    return { ok: false, error: 'data.interval must be month|year' };
  }

  const createdAt = toDate(event.createdAt) ?? new Date();
  const trialEndsAt = toDate(data.trialEndsAt);
  const currentPeriodEnd = toDate(data.currentPeriodEnd);

  if (
    createdAt === 'invalid' ||
    trialEndsAt === 'invalid' ||
    currentPeriodEnd === 'invalid'
  ) {
    return { ok: false, error: 'Invalid date' };
  }

  let featureOverrides: Partial<Record<GrowthOsFeature, boolean>> | null = null;

  if (data.features && typeof data.features === 'object') {
    featureOverrides = {};
    for (const feature of GROWTH_OS_FEATURES) {
      if (typeof data.features[feature] === 'boolean') {
        featureOverrides[feature] = data.features[feature];
      }
    }
  }

  return {
    ok: true,
    update: {
      eventId: event.id,
      eventCreatedAt: createdAt,
      workspaceId: data.workspaceId,
      plan: data.plan,
      status: data.status,
      seats: data.seats ?? null,
      interval: data.interval ?? null,
      trialEndsAt,
      currentPeriodEnd,
      customerRef:
        typeof data.customerRef === 'string' ? data.customerRef : null,
      featureOverrides,
      aiMonthlyCap: Number.isInteger(data.aiMonthlyCap)
        ? data.aiMonthlyCap
        : null,
      rawBody,
    },
  };
};

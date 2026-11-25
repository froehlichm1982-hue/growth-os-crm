import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { createHash } from 'crypto';
import { DataSource } from 'typeorm';

import { GrowthOsBillingClient } from 'src/engine/core-modules/growth-os/growth-os-billing.client';
import { getGrowthOsConfig } from 'src/engine/core-modules/growth-os/growth-os.config';
import {
  GROWTH_OS_FEATURE_LABELS,
  GROWTH_OS_FEATURE_MIN_PLAN,
  GROWTH_OS_PLAN_DEFINITIONS,
  type GrowthOsBillingInterval,
  type GrowthOsBillingStatus,
  type GrowthOsFeature,
  type GrowthOsPlan,
} from 'src/engine/core-modules/growth-os/growth-os-plan.constants';
import {
  GROWTH_OS_UPGRADE_HINT,
  GrowthOsPlanLimitException,
} from 'src/engine/core-modules/growth-os/growth-os-plan.exception';
import {
  computeEffectiveEntitlement,
  type GrowthOsEffectiveEntitlement,
  type GrowthOsStoredEntitlement,
} from 'src/engine/core-modules/growth-os/utils/compute-effective-entitlement.util';

const TABLE = 'core."growthOsPlanEntitlement"';
const CACHE_TTL_MS = 5_000;

export type GrowthOsEntitlementUpdate = {
  eventId: string;
  eventCreatedAt: Date;
  workspaceId: string;
  plan: GrowthOsPlan;
  status: GrowthOsBillingStatus;
  seats: number | null;
  interval: GrowthOsBillingInterval | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  customerRef: string | null;
  featureOverrides: Partial<Record<GrowthOsFeature, boolean>> | null;
  aiMonthlyCap: number | null;
  rawBody: string;
};

export type GrowthOsUsage = {
  seatsUsed: number;
  pendingInvitations: number;
  pipelines: number;
};

// Per-workspace plan entitlements (AGPL). The table is created on boot with
// CREATE TABLE IF NOT EXISTS: upstream froze TypeORM migrations and this keeps
// the fork's schema change in one file.
@Injectable()
export class GrowthOsEntitlementService implements OnModuleInit {
  private readonly logger = new Logger(GrowthOsEntitlementService.name);
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: GrowthOsEffectiveEntitlement }
  >();

  constructor(
    @InjectDataSource()
    private readonly coreDataSource: DataSource,
    private readonly growthOsBillingClient: GrowthOsBillingClient,
  ) {}

  // Tell growth-os-billing the new member count (licensed seat quantity).
  async notifySeatChange(workspaceId: string) {
    const usage = await this.getUsage(workspaceId);

    this.growthOsBillingClient.pushSeatCount(workspaceId, usage.seatsUsed);
  }

  async onModuleInit() {
    try {
      await this.ensureTable();
    } catch (error) {
      this.logger.error(`Could not ensure ${TABLE}: ${error}`);
    }
  }

  async ensureTable() {
    await this.coreDataSource.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        "workspaceId" uuid PRIMARY KEY REFERENCES core."workspace"("id") ON DELETE CASCADE,
        "plan" varchar(16) NOT NULL,
        "status" varchar(16) NOT NULL,
        "seats" integer NULL,
        "interval" varchar(8) NULL,
        "trialEndsAt" timestamptz NULL,
        "currentPeriodEnd" timestamptz NULL,
        "statusChangedAt" timestamptz NULL,
        "customerRef" varchar(255) NULL,
        "featureOverrides" jsonb NULL,
        "aiMonthlyCap" integer NULL,
        "aiUsageCount" integer NOT NULL DEFAULT 0,
        "aiUsagePeriod" varchar(7) NULL,
        "lastEventId" varchar(255) NULL,
        "lastEventAt" timestamptz NULL,
        "rawHash" varchar(64) NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )`);
  }

  isDisabled() {
    return getGrowthOsConfig().entitlementsDisabled;
  }

  invalidate(workspaceId: string) {
    this.cache.delete(workspaceId);
  }

  async getStored(
    workspaceId: string,
  ): Promise<(GrowthOsStoredEntitlement & { lastEventId: string | null; lastEventAt: Date | null; customerRef: string | null }) | null> {
    const rows = await this.coreDataSource.query(
      `SELECT * FROM ${TABLE} WHERE "workspaceId" = $1`,
      [workspaceId],
    );

    return rows[0] ?? null;
  }

  async getEntitlement(
    workspaceId: string,
    { skipCache = false }: { skipCache?: boolean } = {},
  ): Promise<GrowthOsEffectiveEntitlement> {
    const cached = this.cache.get(workspaceId);

    if (!skipCache && cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const [stored, workspaceRows] = await Promise.all([
      this.getStored(workspaceId),
      this.coreDataSource.query(
        `SELECT "createdAt" FROM core."workspace" WHERE "id" = $1`,
        [workspaceId],
      ),
    ]);
    const config = getGrowthOsConfig();

    const value = computeEffectiveEntitlement({
      workspaceId,
      stored,
      workspaceCreatedAt: workspaceRows[0]?.createdAt ?? new Date(),
      now: new Date(),
      unpaidAccess: config.unpaidAccess as 'read_only' | 'starter',
      aiMonthlyCap: config.aiMonthlyCap,
    });

    this.cache.set(workspaceId, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });

    return value;
  }

  async getUsage(workspaceId: string): Promise<GrowthOsUsage> {
    const [seats, invitations, pipelines] = await Promise.all([
      this.coreDataSource.query(
        `SELECT count(*)::int AS "count" FROM core."userWorkspace"
          WHERE "workspaceId" = $1 AND "deletedAt" IS NULL`,
        [workspaceId],
      ),
      this.coreDataSource.query(
        `SELECT count(*)::int AS "count" FROM core."appToken"
          WHERE "workspaceId" = $1 AND "type" = 'INVITATION_TOKEN'
            AND "deletedAt" IS NULL AND "revokedAt" IS NULL AND "expiresAt" > now()`,
        [workspaceId],
      ),
      this.countPipelines(workspaceId),
    ]);

    return {
      seatsUsed: seats[0]?.count ?? 0,
      pendingInvitations: invitations[0]?.count ?? 0,
      pipelines,
    };
  }

  // A pipeline is a Kanban view on Opportunities (each one is a separate board).
  async countPipelines(workspaceId: string): Promise<number> {
    const rows = await this.coreDataSource.query(
      `SELECT count(*)::int AS "count" FROM core."view" v
         JOIN core."objectMetadata" o ON o."id" = v."objectMetadataId"
        WHERE v."workspaceId" = $1 AND v."type" = 'KANBAN'
          AND v."deletedAt" IS NULL AND o."nameSingular" = 'opportunity'`,
      [workspaceId],
    );

    return rows[0]?.count ?? 0;
  }

  // ---- gates -------------------------------------------------------------

  private planLabel(plan: GrowthOsPlan) {
    return GROWTH_OS_PLAN_DEFINITIONS[plan].label;
  }

  async assertWritable(workspaceId: string) {
    if (this.isDisabled()) return;
    const entitlement = await this.getEntitlement(workspaceId);

    if (entitlement.isReadOnly) {
      throw new GrowthOsPlanLimitException(
        entitlement.status === 'past_due'
          ? 'This workspace is read-only because the last payment failed. Update your payment method in Settings → Plan & Billing to keep editing. You can still view and export your data.'
          : 'This workspace is read-only because it has no active plan. Choose a plan in Settings → Plan & Billing to keep editing. You can still view and export your data.',
        'readOnly',
      );
    }
  }

  async isFeatureEnabled(workspaceId: string, feature: GrowthOsFeature) {
    if (this.isDisabled()) return true;
    const entitlement = await this.getEntitlement(workspaceId);

    return entitlement.features[feature] === true && !entitlement.isReadOnly;
  }

  async assertFeature(workspaceId: string, feature: GrowthOsFeature) {
    if (this.isDisabled()) return;
    await this.assertWritable(workspaceId);

    if (await this.isFeatureEnabled(workspaceId, feature)) return;

    const entitlement = await this.getEntitlement(workspaceId);
    const requiredPlan = GROWTH_OS_FEATURE_MIN_PLAN[feature];

    throw new GrowthOsPlanLimitException(
      `${GROWTH_OS_FEATURE_LABELS[feature]} ${feature === 'customObjects' || feature === 'workflows' || feature === 'customRoles' ? 'are' : 'is'} included in ${this.planLabel(requiredPlan)}${requiredPlan === 'growth' ? ' and Scale' : ''}. Your workspace is on ${this.planLabel(entitlement.effectivePlan)}. ${GROWTH_OS_UPGRADE_HINT}`,
      feature,
    );
  }

  async assertSeatsAvailable(
    workspaceId: string,
    additionalSeats: number,
    { countPendingInvitations }: { countPendingInvitations: boolean },
  ) {
    if (this.isDisabled()) return;
    await this.assertWritable(workspaceId);
    const entitlement = await this.getEntitlement(workspaceId);

    if (entitlement.seatsAllowed === null) return;

    const usage = await this.getUsage(workspaceId);
    const taken =
      usage.seatsUsed +
      (countPendingInvitations ? usage.pendingInvitations : 0);

    if (taken + additionalSeats > entitlement.seatsAllowed) {
      throw new GrowthOsPlanLimitException(
        `Your ${this.planLabel(entitlement.effectivePlan)} plan includes ${entitlement.seatsAllowed} seat${entitlement.seatsAllowed === 1 ? '' : 's'} and ${taken} ${taken === 1 ? 'is' : 'are'} already taken (members and pending invitations). Add seats or upgrade in Settings → Plan & Billing.`,
        'seats',
      );
    }
  }

  async assertCanCreatePipeline(workspaceId: string, objectMetadataId: string) {
    if (this.isDisabled()) return;
    const objectRows = await this.coreDataSource.query(
      `SELECT "nameSingular" FROM core."objectMetadata" WHERE "id" = $1 AND "workspaceId" = $2`,
      [objectMetadataId, workspaceId],
    );

    if (objectRows[0]?.nameSingular !== 'opportunity') return;

    await this.assertWritable(workspaceId);
    const entitlement = await this.getEntitlement(workspaceId);

    if (entitlement.maxPipelines === null) return;

    const pipelines = await this.countPipelines(workspaceId);

    if (pipelines >= entitlement.maxPipelines) {
      throw new GrowthOsPlanLimitException(
        `${this.planLabel(entitlement.effectivePlan)} includes ${entitlement.maxPipelines} pipeline. Unlimited pipelines are included in Growth and Scale. ${GROWTH_OS_UPGRADE_HINT}`,
        'pipelines',
      );
    }
  }

  async assertCanCreateCustomField(
    workspaceId: string,
    objectMetadataId: string,
    newFields = 1,
  ) {
    if (this.isDisabled()) return;
    await this.assertWritable(workspaceId);
    const entitlement = await this.getEntitlement(workspaceId);

    if (entitlement.maxCustomFieldsPerObject === null) return;

    const rows = await this.coreDataSource.query(
      `SELECT count(*)::int AS "count" FROM core."fieldMetadata" f
         JOIN core."workspace" w ON w."id" = f."workspaceId"
        WHERE f."workspaceId" = $1 AND f."objectMetadataId" = $2
          AND f."applicationId" = w."workspaceCustomApplicationId"`,
      [workspaceId, objectMetadataId],
    );
    const existing = rows[0]?.count ?? 0;

    if (existing + newFields > entitlement.maxCustomFieldsPerObject) {
      throw new GrowthOsPlanLimitException(
        `${this.planLabel(entitlement.effectivePlan)} includes ${entitlement.maxCustomFieldsPerObject} custom fields per object. Unlimited custom fields are included in Growth and Scale. ${GROWTH_OS_UPGRADE_HINT}`,
        'customFields',
      );
    }
  }

  async consumeAiRequest(workspaceId: string) {
    if (this.isDisabled()) return;
    await this.assertFeature(workspaceId, 'ai');
    const entitlement = await this.getEntitlement(workspaceId);
    const period = new Date().toISOString().slice(0, 7);

    const rows = await this.coreDataSource.query(
      `UPDATE ${TABLE}
          SET "aiUsageCount" = CASE WHEN "aiUsagePeriod" = $2 THEN "aiUsageCount" + 1 ELSE 1 END,
              "aiUsagePeriod" = $2
        WHERE "workspaceId" = $1
          AND (CASE WHEN "aiUsagePeriod" = $2 THEN "aiUsageCount" ELSE 0 END) < $3
        RETURNING "aiUsageCount"`,
      [workspaceId, period, entitlement.aiMonthlyCap],
    );

    if (rows.length === 0) {
      throw new GrowthOsPlanLimitException(
        `This workspace has used its ${entitlement.aiMonthlyCap} AI requests for this month. The allowance resets on the 1st. Contact support to raise it.`,
        'aiCap',
      );
    }
  }

  // ---- webhook writes ------------------------------------------------------

  async workspaceExists(workspaceId: string) {
    const rows = await this.coreDataSource.query(
      `SELECT 1 FROM core."workspace" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [workspaceId],
    );

    return rows.length > 0;
  }

  async applyUpdate(
    update: GrowthOsEntitlementUpdate,
  ): Promise<'applied' | 'duplicate' | 'stale'> {
    const existing = await this.getStored(update.workspaceId);

    if (existing?.lastEventId === update.eventId) return 'duplicate';

    if (
      existing?.lastEventAt &&
      new Date(existing.lastEventAt) > update.eventCreatedAt
    ) {
      return 'stale';
    }

    const statusChangedAt =
      existing && existing.status === update.status && existing.statusChangedAt
        ? existing.statusChangedAt
        : update.eventCreatedAt;

    await this.coreDataSource.query(
      `INSERT INTO ${TABLE} ("workspaceId", "plan", "status", "seats", "interval",
          "trialEndsAt", "currentPeriodEnd", "statusChangedAt", "customerRef",
          "featureOverrides", "aiMonthlyCap", "lastEventId", "lastEventAt", "rawHash")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT ("workspaceId") DO UPDATE SET
          "plan" = EXCLUDED."plan", "status" = EXCLUDED."status",
          "seats" = EXCLUDED."seats", "interval" = EXCLUDED."interval",
          "trialEndsAt" = EXCLUDED."trialEndsAt",
          "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
          "statusChangedAt" = EXCLUDED."statusChangedAt",
          "customerRef" = EXCLUDED."customerRef",
          "featureOverrides" = EXCLUDED."featureOverrides",
          "aiMonthlyCap" = EXCLUDED."aiMonthlyCap",
          "lastEventId" = EXCLUDED."lastEventId",
          "lastEventAt" = EXCLUDED."lastEventAt",
          "rawHash" = EXCLUDED."rawHash", "updatedAt" = now()`,
      [
        update.workspaceId,
        update.plan,
        update.status,
        update.seats,
        update.interval,
        update.trialEndsAt,
        update.currentPeriodEnd,
        statusChangedAt,
        update.customerRef,
        update.featureOverrides ? JSON.stringify(update.featureOverrides) : null,
        update.aiMonthlyCap,
        update.eventId,
        update.eventCreatedAt,
        createHash('sha256').update(update.rawBody).digest('hex'),
      ],
    );

    this.invalidate(update.workspaceId);

    return 'applied';
  }
}

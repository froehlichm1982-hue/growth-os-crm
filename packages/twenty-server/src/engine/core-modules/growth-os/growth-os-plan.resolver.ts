import { UseFilters, UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { UserInputError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { GrowthOsBillingService } from 'src/engine/core-modules/growth-os/growth-os-billing.service';
import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { GrowthOsSampleDataService } from 'src/engine/core-modules/growth-os/growth-os-sample-data.service';
import {
  GROWTH_OS_FEATURE_LABELS,
  GROWTH_OS_FEATURES,
  GROWTH_OS_GRACE_DAYS,
  GROWTH_OS_PLAN_DEFINITIONS,
  GROWTH_OS_PLANS_ORDER,
  GROWTH_OS_TRIAL_DAYS,
  getGrowthOsLookupKey,
  isGrowthOsPlan,
} from 'src/engine/core-modules/growth-os/growth-os-plan.constants';
import { GrowthOsPlanDTO } from 'src/engine/core-modules/growth-os/dtos/growth-os-plan.dto';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

export const buildGrowthOsCatalog = () => ({
  currency: 'EUR',
  taxNote: 'Net prices per user. VAT is calculated at checkout; add your VAT ID there.',
  trialDays: GROWTH_OS_TRIAL_DAYS,
  graceDays: GROWTH_OS_GRACE_DAYS,
  featureLabels: GROWTH_OS_FEATURE_LABELS,
  plans: GROWTH_OS_PLANS_ORDER.map((plan) => {
    const definition = GROWTH_OS_PLAN_DEFINITIONS[plan];

    return {
      plan,
      label: definition.label,
      priceMonthlyEur: definition.priceMonthlyEur,
      priceYearlyEur: definition.priceYearlyEur,
      lookupKeys: {
        month: getGrowthOsLookupKey(plan, 'month'),
        year: getGrowthOsLookupKey(plan, 'year'),
      },
      maxSeats: definition.maxSeats,
      maxPipelines: definition.maxPipelines,
      maxCustomFieldsPerObject: definition.maxCustomFieldsPerObject,
      apiRequestsPerMinute: definition.apiRequestsPerMinute,
      features: Object.fromEntries(
        GROWTH_OS_FEATURES.map((feature) => [
          feature,
          definition.features[feature],
        ]),
      ),
    };
  }),
});

@UseGuards(WorkspaceAuthGuard)
@UseFilters(PreventNestToAutoLogGraphqlErrorsFilter)
@MetadataResolver()
export class GrowthOsPlanResolver {
  constructor(
    private readonly growthOsEntitlementService: GrowthOsEntitlementService,
    private readonly growthOsBillingService: GrowthOsBillingService,
    private readonly growthOsSampleDataService: GrowthOsSampleDataService,
  ) {}

  // Loads the fictional EU demo set once; returns false if already loaded.
  @Mutation(() => Boolean)
  async growthOsLoadSampleData(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<boolean> {
    return this.growthOsSampleDataService.loadSampleData(workspace.id);
  }

  @Query(() => GrowthOsPlanDTO)
  async growthOsPlan(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<GrowthOsPlanDTO> {
    const [entitlement, usage] = await Promise.all([
      this.growthOsEntitlementService.getEntitlement(workspace.id),
      this.growthOsEntitlementService.getUsage(workspace.id),
    ]);

    return {
      plan: entitlement.plan,
      effectivePlan: entitlement.effectivePlan,
      status: entitlement.status,
      isTrial: entitlement.isTrial,
      trialEndsAt: entitlement.trialEndsAt,
      trialDaysLeft: entitlement.trialDaysLeft,
      graceEndsAt: entitlement.graceEndsAt,
      isReadOnly: entitlement.isReadOnly,
      cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
      interval: entitlement.interval,
      currentPeriodEnd: entitlement.currentPeriodEnd,
      seatsAllowed: entitlement.seatsAllowed,
      seatsUsed: usage.seatsUsed,
      pendingInvitations: usage.pendingInvitations,
      pipelines: usage.pipelines,
      maxPipelines: entitlement.maxPipelines,
      maxCustomFieldsPerObject: entitlement.maxCustomFieldsPerObject,
      apiRequestsPerMinute: entitlement.apiRequestsPerMinute,
      aiMonthlyCap: entitlement.aiMonthlyCap,
      features: entitlement.features,
      catalog: buildGrowthOsCatalog(),
    };
  }

  @Mutation(() => String)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.BILLING))
  async growthOsBillingSessionUrl(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('kind', { type: () => String }) kind: string,
    @Args('plan', { type: () => String, nullable: true }) plan?: string,
    @Args('interval', { type: () => String, nullable: true })
    interval?: string,
    @Args('seats', { type: () => Int, nullable: true }) seats?: number,
    @Args('returnUrl', { type: () => String, nullable: true })
    returnUrl?: string,
    @Args('reason', { type: () => String, nullable: true })
    reason?: string,
  ): Promise<string> {
    if (
      kind !== 'checkout' &&
      kind !== 'portal' &&
      kind !== 'cancel' &&
      kind !== 'payment_method'
    ) {
      throw new UserInputError(
        'kind must be checkout, portal, cancel or payment_method',
      );
    }
    const entitlement = await this.growthOsEntitlementService.getEntitlement(
      workspace.id,
    );
    const usage = await this.growthOsEntitlementService.getUsage(workspace.id);

    return this.growthOsBillingService.getSessionUrl({
      kind,
      workspaceId: workspace.id,
      plan: isGrowthOsPlan(plan) ? plan : entitlement.plan,
      interval: interval === 'year' ? 'year' : 'month',
      seats: Math.max(1, Math.min(seats ?? usage.seatsUsed, 500)),
      returnUrl: returnUrl ?? '',
      reason: reason?.slice(0, 80),
    });
  }
}

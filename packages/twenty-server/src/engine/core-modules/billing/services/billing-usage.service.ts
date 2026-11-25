/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/core-modules/billing/services/billing-usage.service.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

// Growth OS CRM: Twenty usage metering and credit gating are disabled
// (IS_BILLING_ENABLED=false). Calls succeed as no-ops.
import { Injectable } from '@nestjs/common';

import { type BillingResourceCreditUsageDTO } from 'src/engine/core-modules/billing/dtos/billing-resource-credit-usage.dto';
import { type BillingSubscriptionEntity } from 'src/engine/core-modules/billing/entities/billing-subscription.entity';
import { type CreditAvailability } from 'src/engine/core-modules/billing/types/credit-availability.type';
import { type SubscriptionInactiveReason } from 'src/engine/core-modules/billing/types/subscription-inactive-reason.type';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Injectable()
export class BillingUsageService {
  async isAllowanceCounterEnabled(_workspaceId: string): Promise<boolean> {
    return false;
  }

  async assertUsageAllowed(_scope: unknown): Promise<void> {}

  async consumeUsageQuota(_args: unknown): Promise<{
    hasNoMoreAvailableCredits: boolean;
  }> {
    return { hasNoMoreAvailableCredits: false };
  }

  async getSubscriptionInactiveReason(
    _workspaceId: string,
  ): Promise<SubscriptionInactiveReason | null> {
    return null;
  }

  async assertSubscriptionActive(_workspaceId: string): Promise<void> {}

  async getCreditAvailability(
    _workspaceId: string,
  ): Promise<CreditAvailability> {
    return { hasAvailableCredits: false, reason: 'NO_CREDITS' };
  }

  async hasAvailableCredits(_workspaceId: string): Promise<boolean> {
    return false;
  }

  async getResourceCreditProductUsage(
    _workspace: WorkspaceEntity,
  ): Promise<BillingResourceCreditUsageDTO[]> {
    return [];
  }

  getTrialResourceUsageCap(_subscription: BillingSubscriptionEntity): number {
    return 0;
  }

  getResourceUsageCap(_subscription: BillingSubscriptionEntity): number {
    return 0;
  }
}

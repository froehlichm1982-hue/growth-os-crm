// Growth OS CRM: Twenty billing is hard-disabled (see BillingService override).
// AGPL replacement for the Enterprise BillingSubscriptionService: a workspace
// never has a Twenty subscription, entitlements, or a Stripe customer.
import { Injectable } from '@nestjs/common';

import { type BillingEntitlementDTO } from 'src/engine/core-modules/billing/dtos/billing-entitlement.dto';
import { type BillingCustomerEntity } from 'src/engine/core-modules/billing/entities/billing-customer.entity';
import { type BillingSubscriptionEntity } from 'src/engine/core-modules/billing/entities/billing-subscription.entity';
import { type BillingEntitlementKey } from 'src/engine/core-modules/billing/enums/billing-entitlement-key.enum';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const BILLING_DISABLED_MESSAGE =
  'Billing is managed outside Growth OS CRM and is not available here.';

@Injectable()
export class BillingSubscriptionService {
  async getBillingSubscriptions(
    _workspaceId: string,
  ): Promise<BillingSubscriptionEntity[]> {
    return [];
  }

  async getBillingCustomer(
    _workspaceId: string,
  ): Promise<BillingCustomerEntity | null> {
    return null;
  }

  async getCurrentBillingSubscription(_criteria: {
    workspaceId?: string;
    stripeCustomerId?: string;
  }): Promise<BillingSubscriptionEntity | undefined> {
    return undefined;
  }

  async getCurrentBillingSubscriptionOrThrow(_criteria: {
    workspaceId?: string;
    stripeCustomerId?: string;
  }): Promise<BillingSubscriptionEntity> {
    throw new Error(BILLING_DISABLED_MESSAGE);
  }

  async cancelSubscription(_workspaceId: string): Promise<void> {}

  async assertSubscriptionCanceledOrNone(_workspaceId: string): Promise<void> {}

  async handleUnpaidInvoices(_data: unknown): Promise<void> {}

  async getWorkspaceEntitlements(
    _workspaceId: string,
  ): Promise<BillingEntitlementDTO[]> {
    return [];
  }

  async getWorkspaceEntitlementByKey(
    _workspaceId: string,
    _key: BillingEntitlementKey,
  ): Promise<boolean> {
    return false;
  }

  async getWorkspaceEntitlementValue(
    _workspaceId: string,
    _key: BillingEntitlementKey,
  ): Promise<boolean> {
    return false;
  }

  async endTrialPeriod(_workspace: WorkspaceEntity): Promise<never> {
    throw new Error(BILLING_DISABLED_MESSAGE);
  }

  async syncSubscriptionToDatabase(
    _workspaceId: string,
    _stripeSubscriptionId: string,
  ): Promise<void> {}

  getTrialPeriodFreeWorkflowCredits(
    _billingSubscription: BillingSubscriptionEntity,
  ): number {
    return 0;
  }
}

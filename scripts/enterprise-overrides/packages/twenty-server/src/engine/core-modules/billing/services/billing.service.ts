// Growth OS CRM: Twenty billing is hard-disabled; Growth OS billing lives in a
// separate service. Workspaces are active without a Twenty subscription.
import { Injectable } from '@nestjs/common';

import { type BillingEntitlementKey } from 'src/engine/core-modules/billing/enums/billing-entitlement-key.enum';

@Injectable()
export class BillingService {
  isBillingEnabled(): boolean {
    return false;
  }

  async ensureBillingCustomer(_args: {
    userEmail: string;
    workspaceId: string;
    workspaceDisplayName: string | undefined;
  }): Promise<void> {}

  async hasWorkspaceAnySubscription(_workspaceId: string): Promise<boolean> {
    return true;
  }

  async hasEntitlement(
    _workspaceId: string,
    _entitlementKey: BillingEntitlementKey,
  ): Promise<boolean> {
    return false;
  }

  async isSubscriptionIncompleteOnboardingStatus(
    _workspaceId: string,
  ): Promise<boolean> {
    return false;
  }
}

/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/core-modules/billing/services/billing.service.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

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

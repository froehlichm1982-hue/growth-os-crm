import { Global, Module } from '@nestjs/common';

import { GrowthOsBillingService } from 'src/engine/core-modules/growth-os/growth-os-billing.service';
import { GrowthOsBillingClient } from 'src/engine/core-modules/growth-os/growth-os-billing.client';
import { GrowthOsBillingWebhookController } from 'src/engine/core-modules/growth-os/growth-os-billing-webhook.controller';
import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { GrowthOsSampleDataService } from 'src/engine/core-modules/growth-os/growth-os-sample-data.service';
import { GrowthOsPlanResolver } from 'src/engine/core-modules/growth-os/growth-os-plan.resolver';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';

// Global so the gates can be injected at upstream enforcement points with a
// single optional property and no module wiring changes there.
@Global()
@Module({
  imports: [PermissionsModule],
  controllers: [GrowthOsBillingWebhookController],
  providers: [
    GrowthOsEntitlementService,
    GrowthOsBillingClient,
    GrowthOsBillingService,
    GrowthOsPlanResolver,
    GrowthOsSampleDataService,
  ],
  exports: [
    GrowthOsEntitlementService,
    GrowthOsBillingClient,
    GrowthOsBillingService,
  ],
})
export class GrowthOsModule {}

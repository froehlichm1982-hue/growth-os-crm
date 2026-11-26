import {
  BadRequestException,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';

import { type Request } from 'express';

import { getGrowthOsConfig } from 'src/engine/core-modules/growth-os/growth-os.config';
import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { GrowthOsBillingMailService } from 'src/engine/core-modules/growth-os/growth-os-billing-mail.service';
import { parseGrowthOsEntitlementEvent } from 'src/engine/core-modules/growth-os/utils/parse-growth-os-entitlement-event.util';
import {
  pickGrowthOsSignatureHeader,
  verifyGrowthOsSignature,
} from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

// Inbound entitlement push from growth-os-billing. Contract: GROWTH-OS-BILLING.md.
@Controller('webhooks')
export class GrowthOsBillingWebhookController {
  constructor(
    private readonly growthOsEntitlementService: GrowthOsEntitlementService,
    private readonly growthOsBillingMailService: GrowthOsBillingMailService,
  ) {}

  @Post('growth-os-billing')
  @HttpCode(200)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async handle(@Req() request: RawBodyRequest<Request>) {
    const rawBody = request.rawBody?.toString('utf-8');

    const check = verifyGrowthOsSignature({
      secret: getGrowthOsConfig().webhookSecret,
      rawBody,
      // Both header styles of growth-os-billing are accepted.
      header: pickGrowthOsSignatureHeader(request.headers),
    });

    if (!check.ok) {
      throw new UnauthorizedException(`Invalid signature: ${check.reason}`);
    }

    const parsed = parseGrowthOsEntitlementEvent(rawBody as string);

    if (!parsed.ok) {
      throw new BadRequestException(parsed.error);
    }

    if (
      !(await this.growthOsEntitlementService.workspaceExists(
        parsed.update.workspaceId,
      ))
    ) {
      throw new NotFoundException('Unknown workspace');
    }

    const before = await this.growthOsEntitlementService.getStored(
      parsed.update.workspaceId,
    );
    const result = await this.growthOsEntitlementService.applyUpdate(
      parsed.update,
    );

    if (result === 'applied') {
      // Billing mails never block or fail the push (retries would double-send otherwise).
      void this.growthOsBillingMailService
        .onEntitlementApplied(parsed.update.workspaceId, before)
        .catch(() => undefined);
    }

    const entitlement = await this.growthOsEntitlementService.getEntitlement(
      parsed.update.workspaceId,
      { skipCache: true },
    );

    return {
      received: true,
      result,
      workspaceId: entitlement.workspaceId,
      effectivePlan: entitlement.effectivePlan,
      status: entitlement.status,
      seatsAllowed: entitlement.seatsAllowed,
      isReadOnly: entitlement.isReadOnly,
    };
  }
}

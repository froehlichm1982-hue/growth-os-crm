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
import { GROWTH_OS_SIGNATURE_HEADER } from 'src/engine/core-modules/growth-os/growth-os-plan.constants';
import { parseGrowthOsEntitlementEvent } from 'src/engine/core-modules/growth-os/utils/parse-growth-os-entitlement-event.util';
import { verifyGrowthOsSignature } from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

// Inbound entitlement push from growth-os-billing. Contract: GROWTH-OS-BILLING.md.
@Controller('webhooks')
export class GrowthOsBillingWebhookController {
  constructor(
    private readonly growthOsEntitlementService: GrowthOsEntitlementService,
  ) {}

  @Post('growth-os-billing')
  @HttpCode(200)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async handle(@Req() request: RawBodyRequest<Request>) {
    const rawBody = request.rawBody?.toString('utf-8');
    const signatureHeader = request.headers[GROWTH_OS_SIGNATURE_HEADER];

    const check = verifyGrowthOsSignature({
      secret: getGrowthOsConfig().webhookSecret,
      rawBody,
      header: Array.isArray(signatureHeader)
        ? signatureHeader[0]
        : signatureHeader,
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

    const result = await this.growthOsEntitlementService.applyUpdate(
      parsed.update,
    );

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

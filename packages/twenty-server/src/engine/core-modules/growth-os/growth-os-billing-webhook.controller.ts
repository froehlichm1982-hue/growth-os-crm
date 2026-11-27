import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpException,
  NotFoundException,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';

import { type Request } from 'express';

import { getGrowthOsConfig } from 'src/engine/core-modules/growth-os/growth-os.config';
import {
  GrowthOsEntitlementService,
  type GrowthOsEntitlementUpdate,
} from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { parseGrowthOsEntitlementEvent } from 'src/engine/core-modules/growth-os/utils/parse-growth-os-entitlement-event.util';
import {
  pickGrowthOsSignatureHeader,
  verifyGrowthOsSignature,
} from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

// Answer codes (the billing outbox retries 9 times from 30 s to 24 h, then marks a push dead;
// a 400 or 404 is dead at once, so they are only used for permanent problems):
//   200  applied | duplicate | stale | ignored (an event type this module does not use)
//   401  signature missing, malformed, outside the 300 s tolerance or wrong (permanent for this delivery)
//   400  the body is permanently invalid (not JSON, bad field values)
//   404  the workspace id does not exist (truly unknown, or deleted)
//   503  anything transient: secret not readable yet, database down, any unexpected error.
//        The outbox retries and the push is applied later (version ordering makes it safe).
const retryLater = (reason: string) =>
  new ServiceUnavailableException(`Not ready, retry later: ${reason}`);

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
    const secret = getGrowthOsConfig().webhookSecret;

    // The module secret file is not mounted / readable (yet): the CRM is not ready, so the
    // push must be retried, not rejected for good.
    if (!secret) {
      request.res?.setHeader('Retry-After', '60');
      throw retryLater('module secret not available');
    }

    const check = verifyGrowthOsSignature({
      secret,
      rawBody,
      // Both header styles of growth-os-billing are accepted.
      header: pickGrowthOsSignatureHeader(request.headers),
    });

    if (!check.ok) {
      throw new UnauthorizedException(`Invalid signature: ${check.reason}`);
    }

    // Valid and signed, but not an entitlement event: acknowledge it so it is never dead-lettered.
    try {
      const type = JSON.parse(rawBody as string)?.type;

      if (typeof type === 'string' && type !== 'entitlement.updated') {
        return { received: true, result: 'ignored' };
      }
    } catch {
      // handled as invalid below
    }

    const parsed = parseGrowthOsEntitlementEvent(rawBody as string);

    if (!parsed.ok) {
      throw new BadRequestException(parsed.error);
    }

    try {
      return await this.apply(parsed.update);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      request.res?.setHeader('Retry-After', '30');
      throw retryLater('storage unavailable');
    }
  }

  private async apply(
    update: GrowthOsEntitlementUpdate,
  ) {
    if (!(await this.growthOsEntitlementService.workspaceExists(update.workspaceId))) {
      throw new NotFoundException('Unknown workspace');
    }

    // Routed by the workspace id inside the event (data.workspaceId = the id the
    // account was created with), never by the request host: the service has ONE
    // webhook URL for all workspaces. The CRM sends no billing mail: the billing
    // service owns payment-failed, cancellation, invoice and receipt mail.
    const result = await this.growthOsEntitlementService.applyUpdate(update);

    const entitlement = await this.growthOsEntitlementService.getEntitlement(
      update.workspaceId,
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

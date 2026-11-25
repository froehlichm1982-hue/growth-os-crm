import {
  BadRequestException,
  Controller,
  HttpCode,
  PayloadTooLargeException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  type RawBodyRequest,
} from '@nestjs/common';

import { createHash } from 'crypto';
import { type Request } from 'express';

import { normalizeEnvelopeRecipient } from 'src/engine/core-modules/growth-os/bcc-inbox/growth-os-bcc-inbox.utils';
import { GROWTH_OS_SIGNATURE_HEADER } from 'src/engine/core-modules/growth-os/growth-os-plan.constants';
import { verifyGrowthOsSignature } from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { INBOUND_EMAIL_MESSAGE_SOURCE } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/constants/inbound-email-message-source.constant';
import { GrowthOsWebhookInboundEmailMessageSourceService } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/sources/growth-os-webhook-inbound-email-message-source.service';
import {
  MessagingInboundEmailImportJob,
  type MessagingInboundEmailImportJobData,
} from 'src/modules/messaging/message-import-manager/jobs/messaging-inbound-email-import.job';

export const GROWTH_OS_INBOUND_MAX_RAW_BYTES = 10 * 1024 * 1024;

// Generic signed inbound mail webhook for the BCC inbox. Contract (docs/bcc-inbox.md):
// POST /webhooks/growth-os-inbound
// X-Growth-OS-Signature: t=<unix>,v1=<hex HMAC-SHA256 of `${t}.${body}`>
// { "recipients": ["log-…@<INBOUND_EMAIL_DOMAIN>"], "raw": "<base64 RFC 5322 message>" }
@Controller('webhooks')
export class GrowthOsInboundWebhookController {
  constructor(
    @InjectMessageQueue(MessageQueue.messagingQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly growthOsWebhookInboundEmailMessageSourceService: GrowthOsWebhookInboundEmailMessageSourceService,
  ) {}

  @Post('growth-os-inbound')
  @HttpCode(202)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async handle(@Req() request: RawBodyRequest<Request>) {
    const rawBody = request.rawBody?.toString('utf-8');
    const signatureHeader = request.headers[GROWTH_OS_SIGNATURE_HEADER];

    const check = verifyGrowthOsSignature({
      secret: process.env.GROWTH_OS_INBOUND_WEBHOOK_SECRET,
      rawBody,
      header: Array.isArray(signatureHeader)
        ? signatureHeader[0]
        : signatureHeader,
    });

    if (!check.ok) {
      throw new UnauthorizedException(`Invalid signature: ${check.reason}`);
    }

    let payload: { recipients?: unknown; raw?: unknown };

    try {
      payload = JSON.parse(rawBody as string);
    } catch {
      throw new BadRequestException('Body must be JSON');
    }

    const recipients = Array.isArray(payload.recipients)
      ? payload.recipients
          .filter((value): value is string => typeof value === 'string')
          .map(normalizeEnvelopeRecipient)
      : [];

    if (recipients.length === 0 || typeof payload.raw !== 'string') {
      throw new BadRequestException(
        'Expected { recipients: string[], raw: base64 string }',
      );
    }

    const raw = Buffer.from(payload.raw, 'base64');

    if (raw.length === 0) {
      throw new BadRequestException('raw is empty');
    }

    if (raw.length > GROWTH_OS_INBOUND_MAX_RAW_BYTES) {
      throw new PayloadTooLargeException('Message larger than 10 MB');
    }

    const sha256 = createHash('sha256').update(raw).digest('hex');

    await this.growthOsWebhookInboundEmailMessageSourceService.storeRawMessage(
      sha256,
      raw,
    );

    await this.messageQueueService.add<MessagingInboundEmailImportJobData>(
      MessagingInboundEmailImportJob.name,
      {
        source: INBOUND_EMAIL_MESSAGE_SOURCE.GROWTH_OS_WEBHOOK,
        reference: sha256,
        envelopeRecipients: recipients,
      },
      { id: `growth-os-inbound-${sha256}` },
    );

    return { received: true, reference: sha256 };
  }
}

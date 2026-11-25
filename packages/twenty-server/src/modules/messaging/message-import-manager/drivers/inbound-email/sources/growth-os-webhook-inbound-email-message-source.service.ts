import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { InboundEmailParserService } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-parser.service';
import { type InboundEmailMessageSourceInterface } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/sources/inbound-email-message-source.interface';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message';

// Growth OS: the signed inbound webhook (/webhooks/growth-os-inbound) carries
// the raw MIME. The webhook parks it in the shared cache (Redis) for a day and
// queues the import with the SHA-256 as reference, so server and worker do not
// need shared disk and the MIME never lands in job logs.
export const GROWTH_OS_INBOUND_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const getGrowthOsInboundCacheKey = (sha256: string) =>
  `growth-os-inbound:${sha256}`;

@Injectable()
export class GrowthOsWebhookInboundEmailMessageSourceService implements InboundEmailMessageSourceInterface {
  constructor(
    private readonly inboundEmailParserService: InboundEmailParserService,
    @InjectCacheStorage(CacheStorageNamespace.ModuleMessaging)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  isConfigured(): boolean {
    return isNonEmptyString(process.env.GROWTH_OS_INBOUND_WEBHOOK_SECRET);
  }

  async storeRawMessage(sha256: string, raw: Buffer): Promise<void> {
    await this.cacheStorage.set(
      getGrowthOsInboundCacheKey(sha256),
      raw.toString('base64'),
      GROWTH_OS_INBOUND_CACHE_TTL_MS,
    );
  }

  async fetchMessage(reference: string): Promise<MessageWithParticipants> {
    const rawBase64 = await this.cacheStorage.get<string>(
      getGrowthOsInboundCacheKey(reference),
    );

    if (!isDefined(rawBase64)) {
      throw new Error(`Inbound message ${reference} expired or not found`);
    }

    const { message } = await this.inboundEmailParserService.parse(
      Buffer.from(rawBase64, 'base64'),
      reference,
    );

    return message;
  }

  async cleanup(reference: string): Promise<void> {
    await this.cacheStorage.del(getGrowthOsInboundCacheKey(reference));
  }
}

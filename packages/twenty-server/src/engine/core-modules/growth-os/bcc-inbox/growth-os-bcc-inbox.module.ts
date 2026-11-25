import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GrowthOsBccInboxResolver } from 'src/engine/core-modules/growth-os/bcc-inbox/growth-os-bcc-inbox.resolver';
import { GrowthOsBccInboxService } from 'src/engine/core-modules/growth-os/bcc-inbox/growth-os-bcc-inbox.service';
import { GrowthOsInboundWebhookController } from 'src/engine/core-modules/growth-os/bcc-inbox/growth-os-inbound-webhook.controller';
import { ConnectedAccountMetadataModule } from 'src/engine/metadata-modules/connected-account/connected-account-metadata.module';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { MessageChannelMetadataModule } from 'src/engine/metadata-modules/message-channel/message-channel-metadata.module';
import { MessagingInboundEmailDriverModule } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/messaging-inbound-email-driver.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageChannelEntity]),
    ConnectedAccountMetadataModule,
    MessageChannelMetadataModule,
    MessagingInboundEmailDriverModule,
    PermissionsModule,
  ],
  controllers: [GrowthOsInboundWebhookController],
  providers: [GrowthOsBccInboxService, GrowthOsBccInboxResolver],
  exports: [GrowthOsBccInboxService],
})
export class GrowthOsBccInboxModule {}

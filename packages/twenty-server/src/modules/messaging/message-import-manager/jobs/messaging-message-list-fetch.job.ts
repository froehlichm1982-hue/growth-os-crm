import { Inject as GrowthOsInject, Optional as GrowthOsOptional } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { MessageChannelSyncStage } from 'twenty-shared/types';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  MessageImportExceptionHandlerService,
  MessageImportSyncStep,
} from 'src/modules/messaging/message-import-manager/services/messaging-import-exception-handler.service';
import { MessagingMessageListFetchService } from 'src/modules/messaging/message-import-manager/services/messaging-message-list-fetch.service';
import { MessagingMonitoringService } from 'src/modules/messaging/monitoring/services/messaging-monitoring.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';

export type MessagingMessageListFetchJobData = {
  messageChannelId: string;
  workspaceId: string;
};

@Processor({
  queueName: MessageQueue.messagingQueue,
  scope: Scope.REQUEST,
})
export class MessagingMessageListFetchJob {
  // Growth OS CRM: plan entitlement gate (optional so upstream specs still build).
  @GrowthOsOptional()
  @GrowthOsInject(GrowthOsEntitlementService)
  private readonly growthOsEntitlementService?: GrowthOsEntitlementService;

  constructor(
    private readonly messagingMessageListFetchService: MessagingMessageListFetchService,
    private readonly messagingMonitoringService: MessagingMonitoringService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    @InjectRepository(MessageChannelEntity)
    private readonly messageChannelRepository: Repository<MessageChannelEntity>,
    private readonly messageImportErrorHandlerService: MessageImportExceptionHandlerService,
  ) {}

  @Process(MessagingMessageListFetchJob.name)
  async handle(data: MessagingMessageListFetchJobData): Promise<void> {
    const { messageChannelId, workspaceId } = data;

    // Growth OS CRM plan gate
    // Sync is paused (never deleted) while the plan has no email/calendar sync.
    if (
      this.growthOsEntitlementService &&
      !(await this.growthOsEntitlementService.isFeatureEnabled(
        workspaceId,
        'emailCalendarSync',
      ))
    ) {
      return;
    }

    await this.messagingMonitoringService.track({
      eventName: 'message_list_fetch_job.triggered',
      messageChannelId,
      workspaceId,
    });

    const authContext = buildSystemAuthContext(workspaceId);

    await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const messageChannel = await this.messageChannelRepository.findOne({
          where: {
            id: messageChannelId,
            workspaceId,
          },
          relations: { connectedAccount: true, messageFolders: true },
        });

        if (!messageChannel) {
          await this.messagingMonitoringService.track({
            eventName: 'message_list_fetch_job.error.message_channel_not_found',
            messageChannelId,
            workspaceId,
          });

          return;
        }

        if (
          messageChannel.syncStage !==
          MessageChannelSyncStage.MESSAGE_LIST_FETCH_SCHEDULED
        ) {
          return;
        }

        try {
          await this.messagingMonitoringService.track({
            eventName: 'message_list_fetch.started',
            workspaceId,
            connectedAccountId: messageChannel.connectedAccount.id,
            messageChannelId: messageChannel.id,
          });

          await this.messagingMessageListFetchService.processMessageListFetch(
            messageChannel,
            workspaceId,
          );

          await this.messagingMonitoringService.track({
            eventName: 'message_list_fetch.completed',
            workspaceId,
            connectedAccountId: messageChannel.connectedAccount.id,
            messageChannelId: messageChannel.id,
          });
        } catch (error) {
          await this.messageImportErrorHandlerService.handleDriverException(
            error,
            MessageImportSyncStep.MESSAGE_LIST_FETCH,
            messageChannel,
            workspaceId,
          );
        }
      },
      authContext,
      { lite: true },
    );
  }
}

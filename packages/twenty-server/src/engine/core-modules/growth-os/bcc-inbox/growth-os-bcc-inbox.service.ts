import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import {
  ConnectedAccountProvider,
  MessageChannelContactAutoCreationPolicy,
  MessageChannelPendingGroupEmailsAction,
  MessageChannelSyncStage,
  MessageChannelSyncStatus,
  MessageChannelType,
  MessageChannelVisibility,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import {
  buildGrowthOsBccAddress,
  getGrowthOsInboundEmailDomain,
  isGrowthOsBccAddress,
  isGrowthOsInboundConfigured,
} from 'src/engine/core-modules/growth-os/bcc-inbox/growth-os-bcc-inbox.utils';
import { type GrowthOsBccInboxDTO } from 'src/engine/core-modules/growth-os/bcc-inbox/dtos/growth-os-bcc-inbox.dto';
import { GrowthOsPlanLimitException } from 'src/engine/core-modules/growth-os/growth-os-plan.exception';
import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { ConnectedAccountMetadataService } from 'src/engine/metadata-modules/connected-account/connected-account-metadata.service';
import { MessageChannelMetadataService } from 'src/engine/metadata-modules/message-channel/message-channel-metadata.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';

// One BCC / forwarding address per workspace (AGPL, no upstream Enterprise
// email-group access code). Mail sent or forwarded to it is imported as a
// workspace-shared message and matched to people and companies by address.
@Injectable()
export class GrowthOsBccInboxService {
  constructor(
    private readonly growthOsEntitlementService: GrowthOsEntitlementService,
    private readonly connectedAccountMetadataService: ConnectedAccountMetadataService,
    private readonly messageChannelMetadataService: MessageChannelMetadataService,
    @InjectRepository(MessageChannelEntity)
    private readonly messageChannelRepository: Repository<MessageChannelEntity>,
  ) {}

  async findInboxChannel(
    workspaceId: string,
  ): Promise<MessageChannelEntity | null> {
    const domain = getGrowthOsInboundEmailDomain();

    if (domain === '') {
      return null;
    }

    const channels = await this.messageChannelRepository.find({
      where: { workspaceId, type: MessageChannelType.EMAIL_GROUP },
    });

    return (
      channels.find((channel) => isGrowthOsBccAddress(channel.handle, domain)) ??
      null
    );
  }

  async getInbox(workspaceId: string): Promise<GrowthOsBccInboxDTO> {
    const [channel, isFeatureEnabled, entitlement] = await Promise.all([
      this.findInboxChannel(workspaceId),
      this.growthOsEntitlementService.isFeatureEnabled(
        workspaceId,
        'emailCalendarSync',
      ),
      this.growthOsEntitlementService.getEntitlement(workspaceId),
    ]);

    return {
      address: channel?.handle ?? null,
      messageChannelId: channel?.id ?? null,
      isAvailable: isFeatureEnabled && !entitlement.isReadOnly,
      isConfigured: isGrowthOsInboundConfigured(),
    };
  }

  async enableInbox({
    workspaceId,
    userWorkspaceId,
  }: {
    workspaceId: string;
    userWorkspaceId: string;
  }): Promise<GrowthOsBccInboxDTO> {
    await this.growthOsEntitlementService.assertWritable(workspaceId);
    await this.growthOsEntitlementService.assertFeature(
      workspaceId,
      'emailCalendarSync',
    );

    if (!isGrowthOsInboundConfigured()) {
      throw new GrowthOsPlanLimitException(
        'The BCC inbox is not set up on this server yet. Please contact support@scalepoint-ventures.com.',
        'bccInboxNotConfigured',
      );
    }

    const existing = await this.findInboxChannel(workspaceId);

    if (isDefined(existing)) {
      return this.getInbox(workspaceId);
    }

    const address = buildGrowthOsBccAddress(getGrowthOsInboundEmailDomain());

    const connectedAccount = await this.connectedAccountMetadataService.create({
      workspaceId,
      handle: address,
      provider: ConnectedAccountProvider.EMAIL_GROUP,
      userWorkspaceId,
      accessToken: null,
      refreshToken: null,
      visibility: 'workspace',
    });

    await this.messageChannelMetadataService.create({
      workspaceId,
      handle: address,
      displayName: 'BCC inbox',
      connectedAccountId: connectedAccount.id,
      type: MessageChannelType.EMAIL_GROUP,
      visibility: MessageChannelVisibility.SHARE_EVERYTHING,
      syncStage: MessageChannelSyncStage.MESSAGE_LIST_FETCH_PENDING,
      syncStatus: MessageChannelSyncStatus.ACTIVE,
      isSyncEnabled: true,
      isContactAutoCreationEnabled: true,
      contactAutoCreationPolicy:
        MessageChannelContactAutoCreationPolicy.SENT_AND_RECEIVED,
      excludeGroupEmails: false,
      excludeNonProfessionalEmails: false,
      pendingGroupEmailsAction: MessageChannelPendingGroupEmailsAction.NONE,
    });

    return this.getInbox(workspaceId);
  }
}

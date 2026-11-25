import { UseFilters, UseGuards } from '@nestjs/common';
import { Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { GrowthOsBccInboxDTO } from 'src/engine/core-modules/growth-os/bcc-inbox/dtos/growth-os-bcc-inbox.dto';
import { GrowthOsBccInboxService } from 'src/engine/core-modules/growth-os/bcc-inbox/growth-os-bcc-inbox.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@UseGuards(WorkspaceAuthGuard)
@UseFilters(PreventNestToAutoLogGraphqlErrorsFilter)
@MetadataResolver()
export class GrowthOsBccInboxResolver {
  constructor(
    private readonly growthOsBccInboxService: GrowthOsBccInboxService,
  ) {}

  @Query(() => GrowthOsBccInboxDTO)
  @UseGuards(NoPermissionGuard)
  async growthOsBccInbox(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<GrowthOsBccInboxDTO> {
    return this.growthOsBccInboxService.getInbox(workspace.id);
  }

  @Mutation(() => GrowthOsBccInboxDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.WORKSPACE))
  async growthOsEnableBccInbox(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<GrowthOsBccInboxDTO> {
    return this.growthOsBccInboxService.enableInbox({
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }
}

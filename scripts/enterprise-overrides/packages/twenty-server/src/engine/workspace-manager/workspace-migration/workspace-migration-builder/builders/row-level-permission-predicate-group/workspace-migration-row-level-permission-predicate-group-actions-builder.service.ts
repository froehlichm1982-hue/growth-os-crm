// Growth OS CRM: row-level permissions (RLS) are disabled; migration builder
// is a no-op with a valid metadataName.
import { Injectable } from '@nestjs/common';
import { ALL_METADATA_NAME } from 'twenty-shared/metadata';

import { WorkspaceEntityMigrationBuilderService } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/services/workspace-entity-migration-builder.service';

@Injectable()
export class WorkspaceMigrationRowLevelPermissionPredicateGroupActionsBuilderService extends WorkspaceEntityMigrationBuilderService<
  typeof ALL_METADATA_NAME.rowLevelPermissionPredicateGroup
> {
  constructor() {
    super(ALL_METADATA_NAME.rowLevelPermissionPredicateGroup);
  }

  protected validateFlatEntityCreation(): any {
    throw new Error('Growth OS CRM: row-level permissions are not supported.');
  }

  protected validateFlatEntityDeletion(): any {
    throw new Error('Growth OS CRM: row-level permissions are not supported.');
  }

  protected validateFlatEntityUpdate(): any {
    throw new Error('Growth OS CRM: row-level permissions are not supported.');
  }
}

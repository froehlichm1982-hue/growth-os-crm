/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/row-level-permission-predicate/workspace-migration-row-level-permission-predicate-actions-builder.service.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

// Growth OS CRM: row-level permissions (RLS) are disabled; migration builder
// is a no-op with a valid metadataName.
import { Injectable } from '@nestjs/common';
import { ALL_METADATA_NAME } from 'twenty-shared/metadata';

import { WorkspaceEntityMigrationBuilderService } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/services/workspace-entity-migration-builder.service';

@Injectable()
export class WorkspaceMigrationRowLevelPermissionPredicateActionsBuilderService extends WorkspaceEntityMigrationBuilderService<
  typeof ALL_METADATA_NAME.rowLevelPermissionPredicate
> {
  constructor() {
    super(ALL_METADATA_NAME.rowLevelPermissionPredicate);
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

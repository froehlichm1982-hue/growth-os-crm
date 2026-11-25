// Row-level permissions (RLS) are not available in Growth OS CRM: no role can
// define row predicates, so no extra row filter applies. Object- and
// field-level role permissions are enforced by the AGPL ORM code as usual.
import { type RecordGqlOperationFilter } from 'twenty-shared/types';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type WorkspaceInternalContext } from 'src/engine/twenty-orm/interfaces/workspace-internal-context.interface';

export const resolveRowLevelPermissionRecordFilter = (_args: {
  internalContext: WorkspaceInternalContext;
  authContext: WorkspaceAuthContext;
  objectMetadata: FlatObjectMetadata;
}): RecordGqlOperationFilter | null => null;

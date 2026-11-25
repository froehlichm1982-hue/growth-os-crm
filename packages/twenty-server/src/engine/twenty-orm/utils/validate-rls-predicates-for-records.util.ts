/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/twenty-orm/utils/validate-rls-predicates-for-records.util.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

// Row-level permissions (RLS) are not available in Growth OS CRM, so there are
// no row predicates to validate written records against.
import { type ObjectLiteral } from 'typeorm';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type WorkspaceInternalContext } from 'src/engine/twenty-orm/interfaces/workspace-internal-context.interface';

export const validateRLSPredicatesForRecords = <
  T extends ObjectLiteral,
>(_args: {
  records: T[];
  objectMetadata: FlatObjectMetadata;
  internalContext: WorkspaceInternalContext;
  authContext: WorkspaceAuthContext;
  shouldBypassPermissionChecks: boolean;
  errorMessage?: string;
}): void => undefined;

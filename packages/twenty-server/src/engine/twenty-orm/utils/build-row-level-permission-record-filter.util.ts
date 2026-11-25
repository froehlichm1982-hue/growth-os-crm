/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/twenty-orm/utils/build-row-level-permission-record-filter.util.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

// Growth OS CRM: row-level permissions (RLS) are disabled, so SSE event
// filtering applies no extra row filter.
import { type RecordGqlOperationFilter } from 'twenty-shared/types';

export const buildRowLevelPermissionRecordFilter = (
  _args: unknown,
): RecordGqlOperationFilter | null => null;

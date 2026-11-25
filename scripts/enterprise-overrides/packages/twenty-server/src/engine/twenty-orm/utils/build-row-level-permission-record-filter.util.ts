// Growth OS CRM: row-level permissions (RLS) are disabled, so SSE event
// filtering applies no extra row filter.
import { type RecordGqlOperationFilter } from 'twenty-shared/types';

export const buildRowLevelPermissionRecordFilter = (
  _args: unknown,
): RecordGqlOperationFilter | null => null;

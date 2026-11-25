// Row-level permissions (RLS) are not available in Growth OS CRM. Callers only
// reach this with a non-null RLS filter, which the AGPL override of
// resolveRowLevelPermissionRecordFilter never returns. Fail closed if a filter
// ever shows up, instead of silently ignoring it.
import { type RecordGqlOperationFilter } from 'twenty-shared/types';
import { type ObjectLiteral } from 'typeorm';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type OrmFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/orm-flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';

export const renderRowLevelPermissionFilterToSql = (_args: {
  recordFilter: RecordGqlOperationFilter;
  tableAlias: string;
  objectMetadata: FlatObjectMetadata;
  flatFieldMetadataMaps: FlatEntityMaps<OrmFlatFieldMetadata>;
}): { sql: string; parameters: ObjectLiteral } | null => {
  throw new Error(
    'Growth OS CRM: row-level permission filters are not supported.',
  );
};

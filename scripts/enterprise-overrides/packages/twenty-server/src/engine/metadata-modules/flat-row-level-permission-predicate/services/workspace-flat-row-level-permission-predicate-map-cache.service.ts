// Growth OS CRM: row-level permissions (RLS) are disabled; cache stays empty.
import { Injectable } from '@nestjs/common';

import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { type FlatRowLevelPermissionPredicateMaps } from 'src/engine/metadata-modules/row-level-permission-predicate/types/flat-row-level-permission-predicate-maps.type';
import { WorkspaceCache } from 'src/engine/workspace-cache/decorators/workspace-cache.decorator';
import { MetadataFlatEntityMapsCacheProvider } from 'src/engine/workspace-cache/interfaces/metadata-flat-entity-maps-cache-provider.service';

@Injectable()
@WorkspaceCache('flatRowLevelPermissionPredicateMaps', {
  packingPonderation: 1,
})
export class WorkspaceFlatRowLevelPermissionPredicateMapCacheService extends MetadataFlatEntityMapsCacheProvider<'rowLevelPermissionPredicate'> {
  override readonly rowsRequirement = {} as any;

  computeForCache(_ctx: unknown): FlatRowLevelPermissionPredicateMaps {
    return createEmptyFlatEntityMaps();
  }
}

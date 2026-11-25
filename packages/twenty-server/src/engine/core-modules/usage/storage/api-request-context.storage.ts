/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/core-modules/usage/storage/api-request-context.storage.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

// Growth OS CRM: Twenty API usage tracking is disabled. Keep pass-through
// context helpers so query runners do not throw.
import { type ApiType } from 'src/engine/core-modules/usage/types/api-type.type';

export const withApiRequestContext = <T>(
  _apiType: ApiType,
  fn: () => T | Promise<T>,
): T | Promise<T> => fn();

export const getApiType = (): ApiType | undefined => undefined;

// Growth OS CRM: Twenty API usage tracking is disabled. Keep pass-through
// context helpers so query runners do not throw.
import { type ApiType } from 'src/engine/core-modules/usage/types/api-type.type';

export const withApiRequestContext = <T>(
  _apiType: ApiType,
  fn: () => T | Promise<T>,
): T | Promise<T> => fn();

export const getApiType = (): ApiType | undefined => undefined;

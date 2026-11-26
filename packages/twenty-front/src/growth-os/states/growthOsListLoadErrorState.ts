import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// Growth OS: last failed list load per object, so the record index can show
// the inline error card right away instead of firing (and retrying) again.
export const growthOsListLoadErrorState = createAtomState<{
  objectNameSingular: string;
  error: Error;
} | null>({
  key: 'growthOsListLoadErrorState',
  defaultValue: null,
});

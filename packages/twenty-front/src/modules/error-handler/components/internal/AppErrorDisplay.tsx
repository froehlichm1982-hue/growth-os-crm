import { type AppErrorDisplayProps } from '@/error-handler/types/AppErrorDisplayProps';
import { t } from '@lingui/core/macro';

import { GrowthOsErrorState } from '~/growth-os/states/GrowthOsStates';

// Growth OS CRM: kit error state — what failed, Try again, reference id + CET time.
export const AppErrorDisplay = ({
  error,
  resetErrorBoundary,
  title,
}: AppErrorDisplayProps) => (
  <GrowthOsErrorState
    title={title ?? t`Something went wrong on our side`}
    error={error}
    onRetry={resetErrorBoundary}
  />
);

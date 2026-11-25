import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { type ErrorLike } from '@apollo/client';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useCallback } from 'react';
import { logError } from '~/utils/logError';

export const useHandleFindManyRecordsError = ({
  handleError,
  objectMetadataItem,
  silent = false,
}: {
  objectMetadataItem: EnrichedObjectMetadataItem;
  handleError?: (error?: Error) => void;
  // Growth OS: the caller shows an inline error card, so no extra toast.
  silent?: boolean;
}) => {
  const { enqueueErrorSnackBar } = useSnackBar();

  const handleFindManyRecordsError = useCallback(
    (error: ErrorLike) => {
      logError(
        `useFindManyRecords for "${objectMetadataItem.namePlural}" error : ` +
          error,
      );
      if (silent) {
        // inline error card handles it
      } else if (CombinedGraphQLErrors.is(error)) {
        enqueueErrorSnackBar({
          apolloError: error,
        });
      } else {
        enqueueErrorSnackBar({});
      }
      handleError?.(error as Error);
    },
    [enqueueErrorSnackBar, handleError, objectMetadataItem.namePlural, silent],
  );

  return {
    handleFindManyRecordsError,
  };
};

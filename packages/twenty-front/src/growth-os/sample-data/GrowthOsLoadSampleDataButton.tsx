import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { IconDatabase } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';

// Growth OS CRM: workspaces start empty; this loads the fictional EU demo set
// (lead company "Nordlicht Analytics") on demand. Plain English copy.
export const GROWTH_OS_LOAD_SAMPLE_DATA_MUTATION = gql`
  mutation GrowthOsLoadSampleData {
    growthOsLoadSampleData
  }
`;

const GROWTH_OS_SAMPLE_DATA_OBJECTS = ['company', 'person', 'opportunity'];

export const isGrowthOsSampleDataObject = (nameSingular: string) =>
  GROWTH_OS_SAMPLE_DATA_OBJECTS.includes(nameSingular);

export const GrowthOsLoadSampleDataButton = () => {
  const [loadSampleData, { loading }] = useMutation<{
    growthOsLoadSampleData: boolean;
  }>(GROWTH_OS_LOAD_SAMPLE_DATA_MUTATION);
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();

  const handleClick = async () => {
    try {
      const result = await loadSampleData();

      enqueueSuccessSnackBar({
        message: result.data?.growthOsLoadSampleData
          ? 'Sample data loaded: 5 fictional companies, people and deals.'
          : 'Sample data is already in this workspace.',
      });
      // Record caches are per object; a reload is the simplest full refresh.
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error
            ? error.message
            : 'Could not load sample data. Please try again.',
      });
    }
  };

  return (
    <Button
      Icon={IconDatabase}
      title={loading ? 'Loading sample data…' : 'Load sample data'}
      variant="tertiary"
      size="small"
      disabled={loading}
      onClick={handleClick}
      dataTestId="growth-os-load-sample-data"
    />
  );
};

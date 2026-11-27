import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { t } from '@lingui/core/macro';

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
          ? t`Sample data loaded: 5 fictional companies, people and deals.`
          : t`Sample data is already in this workspace.`,
      });
      // Record caches are per object; a reload is the simplest full refresh.
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error
            ? error.message
            : t`Couldn’t load sample data. Try again.`,
      });
    }
  };

  // Rendered on the empty state's "more" line: a link-style action, so the
  // state keeps max 1 primary + 1 secondary button.
  return (
    <span>
      {t`Just looking around?`}{' '}
      <button
        type="button"
        className="growth-os-linklike"
        disabled={loading}
        onClick={handleClick}
        data-testid="growth-os-load-sample-data"
        style={{ minHeight: 44 }}
      >
        {loading ? t`Loading sample data…` : t`Load sample data`}
      </button>
    </span>
  );
};

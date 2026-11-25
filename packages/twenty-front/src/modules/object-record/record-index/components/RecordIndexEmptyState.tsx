import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import {
  GrowthOsForbiddenState,
  isGrowthOsForbiddenError,
} from '~/growth-os/states/GrowthOsForbiddenState';
import { useObjectLabel } from '@/object-metadata/hooks/useObjectLabel';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { RecordIndexEmptyStateDisplay } from '@/object-record/record-index/components/RecordIndexEmptyStateDisplay';
import { getEmptyStateSubTitle } from '@/object-record/record-table/empty-state/utils/getEmptyStateSubTitle';
import { getEmptyStateTitle } from '@/object-record/record-table/empty-state/utils/getEmptyStateTitle';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { anyFieldFilterValueComponentState } from '@/object-record/record-filter/states/anyFieldFilterValueComponentState';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { currentRecordFilterGroupsComponentState } from '@/object-record/record-filter-group/states/currentRecordFilterGroupsComponentState';
import { useOpenObjectRecordsSpreadsheetImportDialog } from '@/object-record/spreadsheet-import/hooks/useOpenObjectRecordsSpreadsheetImportDialog';
import { GrowthOsErrorState } from '~/growth-os/states/GrowthOsStates';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { IconFilterOff, IconSettings } from 'twenty-ui/icon';
import { type ObjectPermission } from '~/generated-metadata/graphql';
import {
  GrowthOsLoadSampleDataButton,
  isGrowthOsSampleDataObject,
} from '~/growth-os/sample-data/GrowthOsLoadSampleDataButton';

type RecordIndexEmptyStateProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  objectPermissions: ObjectPermission;
  isSoftDeleteFilterActive: boolean;
  onRemoveSoftDeleteFilter?: () => void;
  onGoToSettings?: () => void;
  width?: number;
};

export const RecordIndexEmptyState = ({
  objectMetadataItem,
  objectPermissions,
  isSoftDeleteFilterActive,
  onRemoveSoftDeleteFilter,
  onGoToSettings,
  width,
}: RecordIndexEmptyStateProps) => {
  const { t } = useLingui();

  const objectLabelSingular = useObjectLabel(objectMetadataItem);

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem,
  });

  const { openObjectRecordsSpreadsheetImportDialog } =
    useOpenObjectRecordsSpreadsheetImportDialog(objectMetadataItem.nameSingular);
  const setCurrentRecordFilters = useSetAtomComponentState(
    currentRecordFiltersComponentState,
  );
  const setCurrentRecordFilterGroups = useSetAtomComponentState(
    currentRecordFilterGroupsComponentState,
  );
  const setAnyFieldFilterValue = useSetAtomComponentState(
    anyFieldFilterValueComponentState,
  );
  const clearFilters = () => {
    setCurrentRecordFilters([]);
    setCurrentRecordFilterGroups([]);
    setAnyFieldFilterValue('');
  };
  const objectLabelPlural = objectMetadataItem.labelPlural.toLowerCase();

  const { totalCount, error: loadError } = useFindManyRecords({
    objectNameSingular: objectMetadataItem.nameSingular,
    limit: 1,
  });

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );

  const canCreateRecords =
    !isLayoutCustomizationModeEnabled &&
    !hasAnySoftDeleteFilterOnView &&
    canCreateRecordsForObjectMetadataItem({
      objectPermissions,
      objectMetadataItem,
    });

  const handleAddRecordClick = canCreateRecords
    ? () => {
        createNewIndexRecord();
      }
    : undefined;

  // Growth OS: load failed → inline error with Try again + reference id.
  if (loadError && isGrowthOsForbiddenError(loadError)) {
    return <GrowthOsForbiddenState width={width} />;
  }

  if (loadError) {
    return (
      <GrowthOsErrorState
        title={t`We couldn’t load your ${objectLabelPlural}`}
        description={t`This is usually a short connection problem. Try again. If it keeps happening, send us the reference below.`}
        error={loadError}
        onRetry={() => window.location.reload()}
        width={width}
      />
    );
  }

  if (!objectPermissions.canUpdateObjectRecords) {
    return (
      <RecordIndexEmptyStateDisplay
        animatedPlaceholderType="noRecord"
        title={t`No records found`}
        subTitle={t`You are not allowed to create records for this object`}
        width={width}
      />
    );
  }

  if (objectMetadataItem.isRemote) {
    return (
      <RecordIndexEmptyStateDisplay
        animatedPlaceholderType="noRecord"
        title={t`No Data Available for Remote Table`}
        subTitle={t`If this is unexpected, please verify your settings.`}
        ButtonIcon={IconSettings}
        buttonTitle={t`Go to Settings`}
        onButtonClick={onGoToSettings}
        width={width}
      />
    );
  }

  if (isSoftDeleteFilterActive) {
    return (
      <RecordIndexEmptyStateDisplay
        animatedPlaceholderType="noDeletedRecord"
        title={t`No Deleted ${objectLabelSingular} found`}
        subTitle={t`No deleted records matching the filter criteria were found.`}
        ButtonIcon={IconFilterOff}
        buttonTitle={t`Remove Deleted filter`}
        onButtonClick={onRemoveSoftDeleteFilter}
        width={width}
      />
    );
  }

  if (totalCount === 0) {
    const isImportable =
      !objectMetadataItem.nameSingular.startsWith('workflow') &&
      objectMetadataItem.nameSingular !== 'dashboard';

    return (
      <RecordIndexEmptyStateDisplay
        animatedPlaceholderType="noRecord"
        title={getEmptyStateTitle(
          objectMetadataItem.nameSingular,
          objectLabelSingular,
        )}
        subTitle={
          isImportable
            ? t`Import a CSV from your current tool or add them one by one. Your team sees every owner and next step here.`
            : getEmptyStateSubTitle(
                objectMetadataItem.nameSingular,
                objectLabelSingular,
              )
        }
        buttonIcon={isImportable ? 'upload' : 'plus'}
        buttonTitle={isImportable ? t`Import CSV` : t`Add a ${objectLabelSingular}`}
        onButtonClick={
          canCreateRecords
            ? isImportable
              ? () => openObjectRecordsSpreadsheetImportDialog()
              : handleAddRecordClick
            : undefined
        }
        secondary={
          canCreateRecords && isImportable && handleAddRecordClick
            ? {
                label: t`Add a ${objectLabelSingular}`,
                onClick: handleAddRecordClick,
                icon: 'plus',
                testId: 'growth-os-empty-add',
              }
            : undefined
        }
        width={width}
        extra={
          canCreateRecords &&
          isGrowthOsSampleDataObject(objectMetadataItem.nameSingular) ? (
            <GrowthOsLoadSampleDataButton />
          ) : undefined
        }
      />
    );
  }

  return (
    <RecordIndexEmptyStateDisplay
      animatedPlaceholderType="noMatchRecord"
      title={t`No ${objectLabelPlural} match your filters`}
      subTitle={t`Try removing a filter or searching for something else.`}
      buttonIcon="filterOff"
      buttonTitle={t`Clear filters`}
      onButtonClick={clearFilters}
      width={width}
    />
  );
};

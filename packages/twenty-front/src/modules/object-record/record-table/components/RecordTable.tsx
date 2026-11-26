import { growthOsListLoadErrorState } from '~/growth-os/states/growthOsListLoadErrorState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';
import { isNonEmptyString } from '@sniptt/guards';
import { useRef } from 'react';

import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { hasRecordGroupsComponentSelector } from '@/object-record/record-group/states/selectors/hasRecordGroupsComponentSelector';
import { recordIndexHasRecordsComponentSelector } from '@/object-record/record-index/states/selectors/recordIndexHasRecordsComponentSelector';
import { RecordTableBodyEffectsWrapper } from '@/object-record/record-table/components/RecordTableBodyEffectsWrapper';
import { RecordTableContent } from '@/object-record/record-table/components/RecordTableContent';
import { RecordTableEmpty } from '@/object-record/record-table/components/RecordTableEmpty';
import { RecordTableScrollToFocusedCellEffect } from '@/object-record/record-table/components/RecordTableScrollToFocusedCellEffect';
import { RecordTableScrollToFocusedRowEffect } from '@/object-record/record-table/components/RecordTableScrollToFocusedRowEffect';
import { RECORD_TABLE_CLICK_OUTSIDE_LISTENER_ID } from '@/object-record/record-table/constants/RecordTableClickOutsideListenerId';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { useResetTableRowSelection } from '@/object-record/record-table/hooks/internal/useResetTableRowSelection';
import { isRecordTableEmptyStateHiddenComponentState } from '@/object-record/record-table/states/isRecordTableEmptyStateHiddenComponentState';
import { isRecordTableInitialLoadingComponentState } from '@/object-record/record-table/states/isRecordTableInitialLoadingComponentState';
import { useClickOutsideListener } from '@/ui/utilities/pointer-event/hooks/useClickOutsideListener';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import isEmpty from 'lodash.isempty';

export const RecordTable = () => {
  const {
    recordTableId,
    objectNameSingular,
    objectMetadataItem,
    visibleRecordFields,
  } = useRecordTableContextOrThrow();

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const tableBodyRef = useRef<HTMLDivElement>(null);

  const { toggleClickOutside } = useClickOutsideListener(
    RECORD_TABLE_CLICK_OUTSIDE_LISTENER_ID,
  );

  const isRecordTableInitialLoading = useAtomComponentStateValue(
    isRecordTableInitialLoadingComponentState,
    recordTableId,
  );

  const recordTableHasRecords = useAtomComponentSelectorValue(
    recordIndexHasRecordsComponentSelector,
    recordTableId,
  );

  const isRecordTableEmptyStateHidden = useAtomComponentStateValue(
    isRecordTableEmptyStateHiddenComponentState,
    recordTableId,
  );

  const hasRecordGroups = useAtomComponentSelectorValue(
    hasRecordGroupsComponentSelector,
    recordTableId,
  );

  const { resetTableRowSelection } = useResetTableRowSelection(recordTableId);

  // Growth OS: a failed list load shows the error card as soon as the one
  // quick retry has failed, instead of waiting for further reloads.
  const growthOsListLoadError = useAtomStateValue(growthOsListLoadErrorState);
  const hasGrowthOsListLoadError =
    isDefined(growthOsListLoadError) &&
    growthOsListLoadError.objectNameSingular === objectNameSingular;

  const recordTableIsEmpty =
    hasGrowthOsListLoadError ||
    (!isRecordTableInitialLoading && !recordTableHasRecords);

  if (!isNonEmptyString(objectNameSingular)) {
    return <></>;
  }

  const handleDragSelectionStart = () => {
    resetTableRowSelection();
    toggleClickOutside(false);
  };

  const handleDragSelectionEnd = () => {
    toggleClickOutside(true);
  };

  return (
    <>
      {objectPermissions.canReadObjectRecords && (
        <>
          <RecordTableBodyEffectsWrapper
            hasRecordGroups={hasRecordGroups}
            tableBodyRef={tableBodyRef}
          />
          <RecordTableScrollToFocusedCellEffect />
          <RecordTableScrollToFocusedRowEffect />
        </>
      )}
      {isRecordTableInitialLoading &&
      !hasGrowthOsListLoadError &&
      isEmpty(visibleRecordFields) ? null : recordTableIsEmpty &&
        !hasRecordGroups &&
        !isRecordTableEmptyStateHidden ? (
        <RecordTableEmpty tableBodyRef={tableBodyRef} />
      ) : (
        <RecordTableContent
          tableBodyRef={tableBodyRef}
          handleDragSelectionStart={handleDragSelectionStart}
          handleDragSelectionEnd={handleDragSelectionEnd}
          hasRecordGroups={hasRecordGroups}
          recordTableId={recordTableId}
        />
      )}
    </>
  );
};

import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { visibleRecordFieldsComponentSelector } from '@/object-record/record-field/states/visibleRecordFieldsComponentSelector';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { recordIndexAllRecordIdsComponentSelector } from '@/object-record/record-index/states/selectors/recordIndexAllRecordIdsComponentSelector';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';
import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Avatar } from 'twenty-ui/data-display';
import { IconChevronRight } from 'twenty-ui/icon';

import { growthOsFormatMobileFieldValue } from '~/growth-os/mobile/growthOsFormatMobileFieldValue';

// Growth OS CRM: a card list instead of the wide table on phones (≤768px).
// The table stays mounted (hidden) so loading, filters and sorts keep working;
// this list only reads the records the table already loaded.

const MAX_DETAIL_FIELDS = 3;

const SKIPPED_TYPES = new Set<string>([
  FieldMetadataType.ACTOR,
  FieldMetadataType.RICH_TEXT,
  FieldMetadataType.RAW_JSON,
  FieldMetadataType.FILES,
  FieldMetadataType.POSITION,
  FieldMetadataType.TS_VECTOR,
]);

const StyledList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 8px 12px 96px;
`;

const StyledItem = styled.li`
  margin: 0 0 8px;
`;

const StyledCard = styled(Link)`
  align-items: center;
  background: var(--gos-surface);
  border: 1px solid var(--gos-line);
  border-radius: 8px;
  box-shadow: var(--gos-shadow-xs);
  color: inherit;
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  text-decoration: none;

  &:active {
    background: var(--gos-hover);
  }
`;

const StyledBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const StyledName = styled.span`
  color: var(--t-font-color-primary);
  font-size: 1rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledDetails = styled.span`
  color: var(--gos-text-3);
  font-size: 0.85rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const GrowthOsMobileRecordCard = ({
  recordId,
  detailFieldIds,
}: {
  recordId: string;
  detailFieldIds: string[];
}) => {
  const {
    objectMetadataItem,
    indexIdentifierUrl,
    labelIdentifierFieldMetadataItem,
    fieldMetadataItemByFieldMetadataItemId,
  } = useRecordIndexContextOrThrow();
  const record = useAtomFamilyStateValue(recordStoreFamilyState, recordId);

  if (!isDefined(record)) {
    return null;
  }

  const labelValue = isDefined(labelIdentifierFieldMetadataItem)
    ? growthOsFormatMobileFieldValue(
        labelIdentifierFieldMetadataItem,
        record[labelIdentifierFieldMetadataItem.name],
      )
    : null;
  const name = labelValue ?? 'Untitled';

  const details = detailFieldIds
    .map((fieldId) => {
      const field = fieldMetadataItemByFieldMetadataItemId[fieldId];

      return isDefined(field)
        ? growthOsFormatMobileFieldValue(field, record[field.name])
        : null;
    })
    .filter((value): value is string => isDefined(value))
    .slice(0, MAX_DETAIL_FIELDS);

  return (
    <StyledItem>
      <StyledCard
        to={indexIdentifierUrl(recordId)}
        data-testid={`growth-os-mobile-record-${recordId}`}
      >
        <Avatar
          placeholder={name}
          placeholderColorSeed={recordId}
          type={
            objectMetadataItem.nameSingular === 'person' ? 'rounded' : 'squared'
          }
          size="lg"
        />
        <StyledBody>
          <StyledName>{name}</StyledName>
          {details.length > 0 && (
            <StyledDetails>{details.join(' · ')}</StyledDetails>
          )}
        </StyledBody>
        <IconChevronRight size={16} color="var(--gos-text-3)" />
      </StyledCard>
    </StyledItem>
  );
};

// Always rendered so the table never remounts (a remount resets the loaded
// record ids, which would flip this wrapper again and loop). When the cards are
// shown the table is parked off-screen with a real size, so virtualisation and
// loading keep working.
const StyledTableSlot = styled.div`
  display: contents;

  &[data-parked='true'] {
    display: block;
    height: 600px;
    left: -10000px;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    top: 0;
    visibility: hidden;
    width: 100vw;
  }
`;

const GrowthOsMobileRecordList = ({ recordIds }: { recordIds: string[] }) => {
  const { objectNameSingular, labelIdentifierFieldMetadataItem } =
    useRecordIndexContextOrThrow();
  const { objectMetadataItem } = useObjectMetadataItem({ objectNameSingular });
  const visibleRecordFields = useAtomComponentSelectorValue(
    visibleRecordFieldsComponentSelector,
  );

  const fieldsById = new Map(
    objectMetadataItem.fields.map((field) => [field.id, field]),
  );
  const detailFieldIds = visibleRecordFields
    .map((recordField) => recordField.fieldMetadataItemId)
    .filter((fieldId) => fieldId !== labelIdentifierFieldMetadataItem?.id)
    .filter((fieldId) => {
      const field = fieldsById.get(fieldId);

      return isDefined(field) && !SKIPPED_TYPES.has(field.type);
    });

  return (
    <StyledList data-testid="growth-os-mobile-record-list">
      {recordIds.map((recordId) => (
        <GrowthOsMobileRecordCard
          key={recordId}
          recordId={recordId}
          detailFieldIds={detailFieldIds}
        />
      ))}
    </StyledList>
  );
};

// Wraps the record table: on phones with loaded records it shows the card list
// and keeps the table mounted but hidden; otherwise it renders the table as is
// (empty states, loading skeleton and desktop stay upstream).
export const GrowthOsMobileRecordIndex = ({
  children,
}: {
  children: ReactNode;
}) => {
  const isMobile = useIsMobile();
  const recordIds = useAtomComponentSelectorValue(
    recordIndexAllRecordIdsComponentSelector,
  );

  const showCards = isMobile && recordIds.length > 0;

  return (
    <>
      {showCards && <GrowthOsMobileRecordList recordIds={recordIds} />}
      <StyledTableSlot
        data-parked={showCards ? 'true' : 'false'}
        aria-hidden={showCards ? true : undefined}
      >
        {children}
      </StyledTableSlot>
    </>
  );
};

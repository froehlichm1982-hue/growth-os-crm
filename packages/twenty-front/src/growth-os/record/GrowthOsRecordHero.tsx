import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { RecordIdentifierBarTitle } from '@/object-record/record-show/components/RecordIdentifierBarTitle';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { styled } from '@linaria/react';
import { isDefined } from 'twenty-shared/utils';

// Growth OS CRM: hero header on company, person and opportunity record pages:
// the editable record title (logo + serif name) and the key facts as chips.

const HERO_OBJECTS = new Set(['company', 'person', 'opportunity']);

const StyledHero = styled.div`
  align-items: center;
  background: var(--c-bg);
  border-bottom: 1px solid var(--c-line);
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  padding: 18px 24px 16px;

  @media (max-width: 768px) {
    gap: 12px;
    padding: 14px 16px 12px;
  }
`;

const StyledBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const StyledEyebrow = styled.span`
  color: var(--c-link);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const StyledTitle = styled.div`
  color: var(--c-ink);
  min-width: 0;
`;

const StyledChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const StyledChip = styled.span`
  align-items: center;
  background: var(--c-bg-warm);
  border: 1px solid var(--c-line);
  border-radius: var(--r-full);
  color: var(--c-ink-2);
  display: inline-flex;
  font-size: var(--fs-xs);
  font-variant-numeric: lining-nums tabular-nums;
  gap: 4px;
  line-height: 1;
  padding: 5px 10px;
  white-space: nowrap;

  &[data-tone='teal'] {
    background: var(--c-accent-soft);
    border-color: var(--c-accent-soft);
    color: var(--c-link);
  }
`;

const StyledChipLabel = styled.span`
  color: var(--c-ink-3);
`;

type Chip = { label?: string; value: string; tone?: 'teal' };

type AnyRecord = Record<string, unknown> & { id: string };

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const fullName = (value: unknown): string | null => {
  if (!isDefined(value) || typeof value !== 'object') return null;
  const v = value as { firstName?: string; lastName?: string };

  return text([v.firstName, v.lastName].filter(Boolean).join(' '));
};

const relationName = (value: unknown): string | null => {
  if (!isDefined(value) || typeof value !== 'object') return null;
  const v = value as { name?: unknown };

  return typeof v.name === 'string' ? text(v.name) : fullName(v.name);
};

const money = (value: unknown, compact = true): string | null => {
  if (!isDefined(value) || typeof value !== 'object') return null;
  const v = value as { amountMicros?: number | null; currencyCode?: string };

  if (!isDefined(v.amountMicros)) return null;

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: v.currencyCode || 'EUR',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(v.amountMicros / 1_000_000);
};

const domain = (value: unknown): string | null => {
  if (!isDefined(value) || typeof value !== 'object') return null;
  const url = text((value as { primaryLinkUrl?: string }).primaryLinkUrl);

  return url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
};

const place = (value: unknown): string | null => {
  if (!isDefined(value) || typeof value !== 'object') return null;
  const v = value as { addressCity?: string; addressCountry?: string };

  return text([v.addressCity, v.addressCountry].filter(Boolean).join(', '));
};

const date = (value: unknown): string | null =>
  typeof value === 'string' && value !== ''
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : null;

const push = (chips: Chip[], value: string | null, label?: string, tone?: 'teal') => {
  if (isDefined(value)) chips.push({ value, label, tone });
};

export const GrowthOsRecordHero = ({
  objectNameSingular,
  recordId,
}: {
  objectNameSingular: string;
  recordId: string;
}) => {
  const { objectMetadataItem } = useObjectMetadataItem({ objectNameSingular });
  const record = useAtomFamilyStateValue(recordStoreFamilyState, recordId) as
    | AnyRecord
    | null
    | undefined;

  if (!HERO_OBJECTS.has(objectNameSingular) || !isDefined(record)) {
    return null;
  }

  const name =
    objectNameSingular === 'person'
      ? fullName(record.name)
      : text(record.name as string);
  const chips: Chip[] = [];

  if (objectNameSingular === 'company') {
    push(chips, domain(record.domainName));
    push(chips, place(record.address));
    const arr = money(record.annualRevenue);
    push(chips, arr ? `${arr}` : null, 'Revenue');
    push(chips, relationName(record.accountOwner), 'Owner', 'teal');
  }

  if (objectNameSingular === 'opportunity') {
    const stageField = objectMetadataItem.fields.find((f) => f.name === 'stage');
    const stage = stageField?.options?.find((o) => o.value === record.stage);
    push(chips, stage?.label ?? text(record.stage as string), undefined, 'teal');
    push(chips, money(record.amount, false));
    push(chips, date(record.closeDate), 'Close');
    push(chips, relationName(record.company));
    push(chips, relationName(record.owner), 'Owner');
  }

  if (objectNameSingular === 'person') {
    push(chips, text(record.jobTitle as string));
    push(chips, relationName(record.company), undefined, 'teal');
    const emails = record.emails as { primaryEmail?: string } | undefined;
    push(chips, text(emails?.primaryEmail));
    push(chips, text(record.city as string));
  }

  return (
    <StyledHero className="growth-os-record-hero" data-testid="growth-os-record-hero">
      <StyledBody>
        <StyledEyebrow>{objectMetadataItem.labelSingular}</StyledEyebrow>
        <StyledTitle title={name ?? undefined}>
          <RecordIdentifierBarTitle
            objectNameSingular={objectNameSingular}
            objectRecordId={recordId}
          />
        </StyledTitle>
        {chips.length > 0 && (
          <StyledChips>
            {chips.map((chip) => (
              <StyledChip key={`${chip.label}-${chip.value}`} data-tone={chip.tone}>
                {chip.label && <StyledChipLabel>{chip.label}</StyledChipLabel>}
                {chip.value}
              </StyledChip>
            ))}
          </StyledChips>
        )}
      </StyledBody>
    </StyledHero>
  );
};

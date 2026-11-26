import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';

// Growth OS CRM: slim KPI strip above the opportunities views (table and board).
// Reads server-side aggregates only; amounts are summed as stored (EUR demo data).

const OPEN_PIPELINE = gql`
  query GrowthOsOpenPipeline {
    opportunities(filter: { stage: { neq: CUSTOMER } }) {
      totalCount
      sumAmountAmountMicros
    }
  }
`;

const WON_SINCE = gql`
  query GrowthOsWonSince($since: DateTime!) {
    opportunities(
      filter: { and: [{ stage: { eq: CUSTOMER } }, { closeDate: { gte: $since } }] }
    ) {
      totalCount
      sumAmountAmountMicros
    }
  }
`;

type Aggregate = {
  opportunities?: { totalCount: number; sumAmountAmountMicros: number | null };
};

const StyledStrip = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 14px 16px 6px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 12px 12px 4px;
  }
`;

const StyledTile = styled.div`
  background: var(--c-bg);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-xs);
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  position: relative;
  transition: box-shadow var(--dur-2) var(--ease-out);

  /* DS v2: CRM KPI edge (module tile gradient, 3px). */
  &::before {
    background: var(--gos-crm-tile);
    content: '';
    height: var(--gos-glow-edge-height);
    inset: 0 0 auto;
    position: absolute;
  }

  &:hover {
    box-shadow: var(--sh-sm);
  }
  padding: 14px 16px;
`;

const StyledLabel = styled.span`
  color: var(--c-ink-3);
  font-size: var(--fs-xs);
  font-weight: 500;
`;

const StyledValue = styled.span`
  color: var(--c-ink);
  font-family: var(--font-ui);
  font-size: var(--gos-text-3xl);
  font-weight: var(--gos-kpi-weight);
  letter-spacing: var(--gos-kpi-tracking);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: var(--gos-kpi-leading);
`;

const StyledHint = styled.span`
  color: var(--c-ink-3);
  font-size: var(--fs-xs);

  &[data-tone='success'] {
    color: var(--c-success);
    font-weight: 600;
  }
`;

const formatEur = (micros: number | null | undefined) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format((micros ?? 0) / 1_000_000);

const startOfMonthIso = () => {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

export const GrowthOsPipelineKpis = () => {
  const client = useApolloCoreClient();
  const open = useQuery<Aggregate>(OPEN_PIPELINE, {
    client,
    fetchPolicy: 'cache-and-network',
  });
  const won = useQuery<Aggregate>(WON_SINCE, {
    client,
    variables: { since: startOfMonthIso() },
    fetchPolicy: 'cache-and-network',
  });

  const openCount = open.data?.opportunities?.totalCount ?? 0;
  const openSum = open.data?.opportunities?.sumAmountAmountMicros ?? 0;
  const wonCount = won.data?.opportunities?.totalCount ?? 0;
  const wonSum = won.data?.opportunities?.sumAmountAmountMicros ?? 0;

  if (!open.data && !won.data) {
    return null;
  }

  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(
    new Date(),
  );

  return (
    <StyledStrip data-testid="growth-os-pipeline-kpis">
      <StyledTile>
        <StyledLabel>Open pipeline</StyledLabel>
        <StyledValue>{formatEur(openSum)}</StyledValue>
        <StyledHint>across all open stages</StyledHint>
      </StyledTile>
      <StyledTile>
        <StyledLabel>Open deals</StyledLabel>
        <StyledValue>{openCount}</StyledValue>
        <StyledHint>owned by your team</StyledHint>
      </StyledTile>
      <StyledTile>
        <StyledLabel>Won in {monthName}</StyledLabel>
        <StyledValue>{formatEur(wonSum)}</StyledValue>
        <StyledHint data-tone="success">
          {wonCount} {wonCount === 1 ? 'deal' : 'deals'} closed
        </StyledHint>
      </StyledTile>
      <StyledTile>
        <StyledLabel>Avg. deal size</StyledLabel>
        <StyledValue>
          {formatEur(openCount > 0 ? openSum / openCount : 0)}
        </StyledValue>
        <StyledHint>open deals</StyledHint>
      </StyledTile>
    </StyledStrip>
  );
};

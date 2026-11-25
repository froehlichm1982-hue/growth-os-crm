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
  background: #ffffff;
  border: 1px solid #e3e8ee;
  border-radius: 8px;
  box-shadow: 0 1px 2px 0 #111e320a;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 10px 14px;
`;

const StyledLabel = styled.span`
  color: #65758b;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const StyledValue = styled.span`
  color: #111e32;
  font-family: var(--spv-font-ui, Inter, sans-serif);
  font-size: 1.45rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.15;
`;

const StyledHint = styled.span`
  color: #3a7872;
  font-size: 0.75rem;
  font-weight: 500;
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
        <StyledHint>
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

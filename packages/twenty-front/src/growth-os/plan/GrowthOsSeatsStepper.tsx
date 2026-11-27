import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { GROWTH_OS_PRICING } from 'twenty-shared/i18n';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';
import { type GrowthOsPlanData } from '~/growth-os/plan/growthOsPlanGraphql';

// DS v2 billing: seats stepper (min = users in the workspace) with a live net
// total, and the invoices entry. Seat changes and invoices are handled in the
// billing portal; this component never moves money itself.

const StyledBox = styled.div`
  border-top: 1px solid var(--gos-line);
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  padding-top: ${themeCssVariables.spacing[4]};
`;

const StyledLabel = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledHint = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: ${themeCssVariables.spacing[2]} 0 0;
`;

const StyledStepper = styled.div`
  align-items: center;
  background: var(--gos-surface);
  border: 1px solid var(--gos-line);
  border-radius: var(--gos-radius-md);
  display: inline-flex;

  button {
    align-items: center;
    background: transparent;
    border: none;
    color: var(--gos-text-1);
    cursor: pointer;
    display: inline-flex;
    height: 44px;
    justify-content: center;
    width: 44px;
  }

  button:disabled {
    color: var(--gos-text-3);
    cursor: not-allowed;
  }

  button:focus-visible {
    border-radius: var(--gos-radius-md);
    box-shadow: var(--gos-focus-ring);
    outline: none;
  }

  output {
    border-left: 1px solid var(--gos-line);
    border-right: 1px solid var(--gos-line);
    color: var(--gos-text-1);
    font-variant-numeric: tabular-nums;
    font-weight: ${themeCssVariables.font.weight.semiBold};
    line-height: 44px;
    min-width: 56px;
    text-align: center;
  }
`;

const StyledTotal = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
  margin-top: ${themeCssVariables.spacing[2]};

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.lg};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
`;

const GosIconMinus = createGosIcon('minus', 'GosIconMinus');
const GosIconPlus = createGosIcon('plus', 'GosIconPlus');

const MAX_SEATS: Record<string, number | null> = { starter: 3, growth: 25, scale: null };

export const GrowthOsSeatsStepper = ({
  plan,
  loading,
  onOpenPortal,
}: {
  plan: GrowthOsPlanData;
  loading: boolean;
  onOpenPortal: () => void;
}) => {
  const billed = Math.max(plan.seatsAllowed ?? plan.seatsUsed, plan.seatsUsed);
  const [seats, setSeats] = useState(billed);
  const max = MAX_SEATS[plan.plan] ?? null;
  const entry = GROWTH_OS_PRICING.plans.find((p) => p.plan === plan.plan);
  const unit = plan.interval === 'year' && entry ? entry.priceYearlyEur / 12 : (entry?.priceMonthlyEur ?? 0);
  const money = new Intl.NumberFormat(document.documentElement.lang || undefined, {
    style: 'currency',
    currency: 'EUR',
  });
  const total = money.format(seats * unit);
  const usedSeats = plan.seatsUsed;

  return (
    <StyledBox data-testid="growth-os-seats">
      <div>
        <StyledLabel id="gos-seats-label">{t`Seats`}</StyledLabel>
        <StyledRow>
          <StyledStepper role="group" aria-labelledby="gos-seats-label">
            <button
              type="button"
              aria-label={t`Remove a seat`}
              disabled={seats <= usedSeats || loading}
              onClick={() => setSeats((s) => s - 1)}
            >
              <GosIconMinus size={16} />
            </button>
            <output aria-live="polite">{seats}</output>
            <button
              type="button"
              aria-label={t`Add a seat`}
              disabled={(max !== null && seats >= max) || loading}
              onClick={() => setSeats((s) => s + 1)}
            >
              <GosIconPlus size={16} />
            </button>
          </StyledStepper>
          <Button
            title={t`Update seats`}
            variant="secondary"
            disabled={seats === billed || loading}
            onClick={onOpenPortal}
          />
        </StyledRow>
        <StyledTotal>
          <strong>{total}</strong> {t`per month, net`}
        </StyledTotal>
        <StyledHint>
          {t`${usedSeats} in use. You can’t go below the people in your workspace. Changes are prorated on the next invoice.`}
        </StyledHint>
      </div>
      <div>
        <StyledLabel>{t`Invoices`}</StyledLabel>
        <StyledHint style={{ marginTop: 0 }}>
          {t`Every invoice is emailed to the billing contact as a PDF. You can download past invoices and change the billing address in the billing portal.`}
        </StyledHint>
        <div style={{ marginTop: 12 }}>
          <Button
            title={t`View invoices`}
            variant="secondary"
            disabled={loading}
            onClick={onOpenPortal}
          />
        </div>
      </div>
    </StyledBox>
  );
};

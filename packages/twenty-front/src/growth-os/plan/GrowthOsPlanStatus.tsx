import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { themeCssVariables } from 'twenty-ui/theme-constants';
import { UndecoratedLink } from 'twenty-ui/navigation';
import {
  getGrowthOsStatusLine,
  useGrowthOsPlan,
} from '~/growth-os/plan/useGrowthOsPlan';

const StyledStatus = styled.div<{ tone: 'ok' | 'warn' | 'danger' }>`
  background: ${({ tone }) =>
    tone === 'ok'
      ? 'rgba(70,145,137,0.10)'
      : tone === 'warn'
        ? 'rgba(217,149,40,0.12)'
        : 'rgba(220,64,64,0.10)'};
  border-radius: 6px;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: 2px;
  margin: 0 ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  a,
  span.growth-os-cta {
    color: var(--c-link);
    font-weight: ${themeCssVariables.font.weight.medium};
  }
`;

// Sidebar plan chip: trial days left, grace or read-only state + upgrade link.
export const GrowthOsPlanStatus = () => {
  const { plan } = useGrowthOsPlan();

  if (!plan || (plan.status === 'active' && !plan.isReadOnly)) return null;

  const tone = plan.isReadOnly
    ? 'danger'
    : plan.status === 'trialing'
      ? 'ok'
      : 'warn';

  return (
    <StyledStatus tone={tone} data-testid="growth-os-plan-status">
      <span>{getGrowthOsStatusLine(plan)}</span>
      <UndecoratedLink to={getSettingsPath(SettingsPath.Billing)}>
        <span className="growth-os-cta">
          {plan.status === 'trialing' ? t`See plans →` : t`Choose a plan →`}
        </span>
      </UndecoratedLink>
    </StyledStatus>
  );
};

import { styled } from '@linaria/react';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { themeCssVariables } from 'twenty-ui/theme-constants';
import { UndecoratedLink } from 'twenty-ui/navigation';
import { useGrowthOsPlan } from '~/growth-os/plan/useGrowthOsPlan';

const StyledNotice = styled.div`
  background: rgba(217, 149, 40, 0.12);
  border-radius: 8px;
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin-bottom: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[3]};

  a {
    color: var(--c-link);
    font-weight: ${themeCssVariables.font.weight.medium};
  }
`;

// Shown where mail/calendar sync or the BCC inbox would start, when the plan
// does not include it (Starter, or any plan in read-only).
export const GrowthOsSyncPlanNotice = () => {
  const { plan } = useGrowthOsPlan();

  if (!plan) return null;

  const isBlocked = plan.isReadOnly || plan.features?.emailCalendarSync !== true;

  if (!isBlocked) return null;

  return (
    <StyledNotice data-testid="growth-os-sync-plan-notice">
      {plan.isReadOnly
        ? 'This workspace is read-only, so new mailboxes and the BCC inbox are paused. '
        : 'Email and calendar sync and the BCC inbox are part of Growth and Scale. Your workspace is on Starter. '}
      <UndecoratedLink to={getSettingsPath(SettingsPath.Billing)}>
        See plans →
      </UndecoratedLink>
    </StyledNotice>
  );
};

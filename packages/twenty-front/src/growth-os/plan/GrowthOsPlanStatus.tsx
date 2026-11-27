import { t } from '@lingui/core/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { Link } from 'react-router-dom';
import {
  getGrowthOsStatusLine,
  useGrowthOsPlan,
} from '~/growth-os/plan/useGrowthOsPlan';

// DS v2 sidebar plan / usage card: plan or trial line, seats in use with an
// aurora meter, and one secondary action ("Choose plan" / "Manage plan").
export const GrowthOsPlanStatus = () => {
  const { plan } = useGrowthOsPlan();

  if (!plan) return null;

  const tone = plan.isReadOnly
    ? 'danger'
    : plan.status === 'trialing' || plan.status === 'active'
      ? 'ok'
      : 'warn';

  const seatsAllowed = plan.seatsAllowed ?? null;
  const seatsUsed = plan.seatsUsed ?? 0;
  const seatShare =
    seatsAllowed && seatsAllowed > 0
      ? Math.min(100, Math.round((seatsUsed / seatsAllowed) * 100))
      : null;
  const seatLine =
    seatsAllowed !== null
      ? t`${seatsUsed} of ${seatsAllowed} seats in use`
      : seatsUsed === 1
        ? t`1 seat in use`
        : t`${seatsUsed} seats in use`;

  return (
    <div className="growth-os-plan" data-tone={tone} data-testid="growth-os-plan-status">
      <b>{getGrowthOsStatusLine(plan)}</b>
      {seatShare !== null && (
        <div
          className="growth-os-meter"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={seatsAllowed ?? 0}
          aria-valuenow={seatsUsed}
          aria-label={seatLine}
        >
          <i style={{ width: `${Math.max(seatShare, 4)}%` }} />
        </div>
      )}
      <small>{seatLine}</small>
      <Link
        to={getSettingsPath(SettingsPath.Billing)}
        className="growth-os-plan-btn"
      >
        {(plan.status === 'active' || plan.hasSubscription) && !plan.isReadOnly ? t`Manage plan` : t`Choose plan`}
      </Link>
    </div>
  );
};

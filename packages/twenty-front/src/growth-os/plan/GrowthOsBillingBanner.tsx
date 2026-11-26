import { i18n } from '@lingui/core';
import { t } from '@lingui/core/macro';
import { useNavigate } from 'react-router-dom';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { usePermissionFlagMap } from '@/settings/roles/hooks/usePermissionFlagMap';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import { GROWTH_OS_GRACE_DAYS_UI } from '~/growth-os/plan/growthOsBillingConstants';
import { useGrowthOsPlan } from '~/growth-os/plan/useGrowthOsPlan';
import {
  growthOsDaysUntil,
  useGrowthOsBillingSession,
} from '~/growth-os/plan/useGrowthOsBillingSession';
import { GrowthOsIcon } from '~/growth-os/states/GrowthOsStates';
import '~/growth-os/states/growth-os-states.css';

export const formatGrowthOsLocalDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(
        i18n.locale?.startsWith('de') ? 'de-DE' : 'en-GB',
        { day: 'numeric', month: 'short', timeZone: 'Europe/Berlin' },
      )
    : '';

// Persistent, full-width billing banner on every page (PRODUCT-UX-STANDARD
// §3.5): payment failed (7-day grace with day counter), paused, read-only.
// Always exactly 1 action; non-admins are told to ask their admin.
export const GrowthOsBillingBanner = () => {
  const { plan } = useGrowthOsPlan();
  const permissionMap = usePermissionFlagMap();
  const canManageBilling = permissionMap[PermissionFlagType.BILLING] === true;
  const { openSession, loading } = useGrowthOsBillingSession();
  const navigate = useNavigate();

  if (!plan) return null;

  const until = formatGrowthOsLocalDate(plan.graceEndsAt);
  const goToBilling = () => navigate(getSettingsPath(SettingsPath.Billing));

  if (plan.isReadOnly) {
    return (
      <div
        className="gos-banner danger"
        role="status"
        data-testid="growth-os-banner-read-only"
      >
        <span className="gos-banner-icon">
          <GrowthOsIcon name="lock" size={18} />
        </span>
        <span className="gos-banner-text">
          <b>{t`This workspace is read-only.`}</b>{' '}
          {canManageBilling
            ? t`You can still view and export everything, and nothing was deleted. Choose a plan to edit again.`
            : t`You can still view and export everything. Ask your admin to choose a plan.`}
        </span>
        {canManageBilling && (
          <button
            type="button"
            className="gos-btn gos-btn-primary"
            onClick={goToBilling}
          >
            {t`Choose a plan`}
          </button>
        )}
      </div>
    );
  }

  if (plan.status === 'past_due') {
    const daysLeft = growthOsDaysUntil(plan.graceEndsAt) ?? 0;
    const day = Math.min(
      GROWTH_OS_GRACE_DAYS_UI,
      Math.max(1, GROWTH_OS_GRACE_DAYS_UI - daysLeft + 1),
    );

    return (
      <div
        className="gos-banner danger"
        role="alert"
        data-testid="growth-os-banner-payment-failed"
      >
        <span className="gos-banner-icon">
          <GrowthOsIcon name="alert" size={18} />
        </span>
        <span className="gos-banner-text">
          <b>{t`Your payment didn’t go through.`}</b>{' '}
          {canManageBilling
            ? t`Update it by ${until} to keep full access.`
            : t`Ask your admin to update billing by ${until} to keep full access.`}{' '}
          <span className="gos-banner-meta">
            {t`Grace day ${day} of ${GROWTH_OS_GRACE_DAYS_UI}`}
          </span>
        </span>
        {canManageBilling && (
          <button
            type="button"
            className="gos-btn gos-btn-primary"
            disabled={loading}
            onClick={() => openSession({ kind: 'portal' })}
            data-testid="growth-os-banner-update-payment"
          >
            {t`Update payment method`}
          </button>
        )}
      </div>
    );
  }

  const isPaused =
    !plan.isTrial &&
    plan.status !== 'active' &&
    plan.effectivePlan !== plan.plan;

  if (isPaused && plan.graceEndsAt) {
    return (
      <div
        className="gos-banner warn"
        role="status"
        data-testid="growth-os-banner-paused"
      >
        <span className="gos-banner-icon">
          <GrowthOsIcon name="alert" size={18} />
        </span>
        <span className="gos-banner-text">
          <b>{t`Paid features are paused.`}</b>{' '}
          {t`Your workspace uses Starter limits until ${until}, then becomes read-only. Nothing is deleted.`}
        </span>
        {canManageBilling && (
          <button
            type="button"
            className="gos-btn gos-btn-primary"
            onClick={goToBilling}
          >
            {t`Choose a plan`}
          </button>
        )}
      </div>
    );
  }

  return null;
};

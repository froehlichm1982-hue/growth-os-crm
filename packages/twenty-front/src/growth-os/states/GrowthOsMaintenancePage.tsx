import { useLingui } from '@lingui/react/macro';

import { GROWTH_OS_BRAND } from '~/growth-os/brand';
import { GrowthOsSystemPage } from '~/growth-os/states/GrowthOsSystemPage';

// Growth OS CRM: shown when the back end cannot be reached (maintenance or
// outage). No router here: this renders before the app shell.
export const GrowthOsMaintenancePage = () => {
  const { t } = useLingui();

  return (
    <GrowthOsSystemPage
      testId="growth-os-maintenance"
      code={t`Maintenance`}
      tone="warn"
      title={t`We’ll be right back`}
      lead={t`Growth OS CRM is briefly unavailable, usually for planned maintenance. Your data is safe. This page tries again on its own.`}
      actions={
        <>
          <button type="button" className="gos-btn gos-btn-primary" onClick={() => window.location.reload()}>
            {t`Try again`}
          </button>
          <a className="gos-btn gos-btn-secondary" href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}>
            {t`Contact support`}
          </a>
        </>
      }
    />
  );
};

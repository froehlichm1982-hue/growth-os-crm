import { useLingui } from '@lingui/react/macro';
import { useNavigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';

import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { GROWTH_OS_BRAND } from '~/growth-os/brand';
import { GrowthOsSystemPage } from '~/growth-os/states/GrowthOsSystemPage';

// Growth OS CRM: kit 404 (reference-kit/404.html).
export const NotFound = () => {
  const { t } = useLingui();
  const navigate = useNavigate();

  return (
    <>
      <PageTitle title={t`Page not found · Growth OS CRM`} />
      <GrowthOsSystemPage
        code={t`Error 404`}
        title={t`This page doesn’t exist`}
        lead={t`The link may be old, or the page has moved. Nothing is wrong with your account or data.`}
        actions={
          <>
            <button type="button" className="gos-btn gos-btn--primary" onClick={() => navigate(AppPath.Index)}>
              {t`Go to your workspace`}
            </button>
            <button type="button" className="gos-btn gos-btn--secondary" onClick={() => navigate(-1)}>
              {t`Go back`}
            </button>
          </>
        }
        links={[
          { href: '/objects/companies', title: t`Companies`, text: t`Find people and companies` },
          { href: '/objects/opportunities', title: t`Pipeline`, text: t`Your open deals` },
          { href: `mailto:${GROWTH_OS_BRAND.supportEmail}`, title: t`Support`, text: t`Write to a real person` },
        ]}
      />
    </>
  );
};

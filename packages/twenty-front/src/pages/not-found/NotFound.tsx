import { useLingui } from '@lingui/react/macro';
import { useNavigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';

import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { GROWTH_OS_BRAND, GROWTH_OS_LOGO_LIGHT } from '~/growth-os/brand';
import '~/growth-os/auth/growth-os-auth-fields.css';
import '~/growth-os/states/growth-os-system.css';

// Growth OS CRM: kit 404 (reference-kit/404.html).
export const NotFound = () => {
  const { t } = useLingui();
  const navigate = useNavigate();

  return (
    <div className="gos-sys">
      <PageTitle title={t`Page not found · Growth OS CRM`} />
      <header className="gos-sys-top">
        <a href={AppPath.Index} aria-label={t`ScalePoint Growth OS home`}>
          <img src={GROWTH_OS_LOGO_LIGHT} alt="ScalePoint" width={140} height={28} />
        </a>
        <a className="gos-btn gos-btn-ghost" href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}>
          {t`Contact support`}
        </a>
      </header>
      <main className="gos-sys-body" id="main">
        <div>
          <span className="gos-sys-code">
            <i />
            {t`Error 404`}
          </span>
          <h1>{t`This page doesn’t exist`}</h1>
          <p className="gos-lead">
            {t`The link may be old, or the page has moved. Nothing is wrong with your account or data.`}
          </p>
          <div className="gos-actions">
            <button type="button" className="gos-btn gos-btn-primary" onClick={() => navigate(AppPath.Index)}>
              {t`Go to your workspace`}
            </button>
            <button type="button" className="gos-btn gos-btn-secondary" onClick={() => navigate(-1)}>
              {t`Go back`}
            </button>
          </div>
          <nav className="gos-sys-links" aria-label={t`Popular destinations`}>
            <a href="/objects/companies">
              <b>{t`Companies`}</b>
              {t`Find people and companies`}
            </a>
            <a href="/objects/opportunities">
              <b>{t`Pipeline`}</b>
              {t`Your open deals`}
            </a>
            <a href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}>
              <b>{t`Support`}</b>
              {t`Write to a real person`}
            </a>
          </nav>
        </div>
      </main>
      <footer className="gos-sys-foot">
        <span>© 2026 {GROWTH_OS_BRAND.companyLegalName}</span>
        <a href={GROWTH_OS_BRAND.legal.terms} target="_blank" rel="noopener noreferrer">{t`Terms`}</a>
        <a href={GROWTH_OS_BRAND.legal.privacy} target="_blank" rel="noopener noreferrer">{t`Privacy`}</a>
        <a href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}>{GROWTH_OS_BRAND.supportEmail}</a>
      </footer>
    </div>
  );
};

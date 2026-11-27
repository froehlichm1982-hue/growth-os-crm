import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';

import { GROWTH_OS_BRAND, GROWTH_OS_LOGO_LIGHT } from '~/growth-os/brand';
import { GROWTH_OS_LICENCES_PATH } from '~/growth-os/licences/growthOsLicencesPath';
import '~/growth-os/states/growth-os-system.css';

export type GrowthOsSystemLink = { href: string; title: string; text: string };

// Growth OS CRM: kit system page shell (reference-kit 404.html / 500.html).
// Used for 404, 403 and maintenance / back end unreachable.
export const GrowthOsSystemPage = ({
  code,
  tone = 'default',
  title,
  lead,
  actions,
  links,
  testId,
  children,
}: {
  code: string;
  tone?: 'default' | 'danger' | 'warn';
  title: string;
  lead: ReactNode;
  actions: ReactNode;
  links?: GrowthOsSystemLink[];
  testId?: string;
  children?: ReactNode;
}) => {
  const { t } = useLingui();

  return (
    <div className="growth-os-sys" data-testid={testId}>
      <header className="growth-os-sys-top">
        <a href="/" aria-label={t`ScalePoint Growth OS home`}>
          <img src={GROWTH_OS_LOGO_LIGHT} alt="ScalePoint" width={140} height={28} />
        </a>
        <a className="gos-btn gos-btn--ghost" href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}>
          {t`Contact support`}
        </a>
      </header>
      <main className="growth-os-sys-body" id="main">
        <div>
          <span className={`growth-os-sys-code ${tone}`}>
            <i />
            {code}
          </span>
          <h1>{title}</h1>
          <div className="growth-os-lead">{lead}</div>
          <div className="gos-actions">{actions}</div>
          {links && links.length > 0 && (
            <nav className="growth-os-sys-links" aria-label={t`Popular destinations`}>
              {links.map((link) => (
                <a key={link.href + link.title} href={link.href}>
                  <b>{link.title}</b>
                  {link.text}
                </a>
              ))}
            </nav>
          )}
          {children}
        </div>
      </main>
      <footer className="growth-os-sys-foot">
        <span>© 2026 {GROWTH_OS_BRAND.companyLegalName}</span>
        <a href={GROWTH_OS_BRAND.legal.terms} target="_blank" rel="noopener noreferrer">{t`Terms`}</a>
        <a href={GROWTH_OS_BRAND.legal.privacy} target="_blank" rel="noopener noreferrer">{t`Privacy`}</a>
        <a href={GROWTH_OS_LICENCES_PATH}>{t`Open-source licences`}</a>
        <a href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}>{GROWTH_OS_BRAND.supportEmail}</a>
      </footer>
    </div>
  );
};

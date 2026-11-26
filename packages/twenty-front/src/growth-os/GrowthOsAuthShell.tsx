import { GROWTH_OS_LICENCES_PATH } from '~/growth-os/licences/growthOsLicencesPath';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';

import { GROWTH_OS_PRICING } from 'twenty-shared/i18n';

import { GROWTH_OS_BRAND, GROWTH_OS_LOGO_LIGHT } from '~/growth-os/brand';

import './growth-os-auth.css';

// Growth OS CRM auth frame, built on the product reference kit (auth.html):
// form column on the left (logo + module chip, switch link, legal footer) and
// the navy proof panel on the right (≥ 1024px only). Demo data is the
// Nordlicht Analytics cast only.

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M13.3 4.3L6.5 11.1 3 7.6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GrowthOsAuthShell = ({ children }: { children: ReactNode }) => {
  const { t } = useLingui();
  const trialDays = GROWTH_OS_PRICING.trialDays;
  const fromPrice = GROWTH_OS_PRICING.plans[0].priceMonthlyEur;

  return (
    <div className="gos-auth">
      <div className="gos-auth-main">
        <header className="gos-auth-top">
          <div className="gos-auth-brand">
            <a href={GROWTH_OS_BRAND.marketingUrl} aria-label={t`ScalePoint Growth OS home`}>
              <img src={GROWTH_OS_LOGO_LIGHT} alt="ScalePoint" width={140} height={28} />
            </a>
            <span className="gos-module-chip">CRM</span>
          </div>
          <p className="gos-top-link">
            <span className="gos-hide-xs">{t`New here?`} </span>
            <a href={`${GROWTH_OS_BRAND.marketingUrl}#pricing`} target="_blank" rel="noopener noreferrer">
              {t`See plans`}
            </a>
          </p>
        </header>
        <main id="main" className="gos-auth-card">
          {children}
        </main>
        <footer className="gos-auth-foot">
          <span>© 2026 {GROWTH_OS_BRAND.companyLegalName}</span>
          <a href={GROWTH_OS_BRAND.legal.terms} target="_blank" rel="noopener noreferrer">{t`Terms`}</a>
          <a href={GROWTH_OS_BRAND.legal.privacy} target="_blank" rel="noopener noreferrer">{t`Privacy`}</a>
          <a href={GROWTH_OS_BRAND.legal.dpa} target="_blank" rel="noopener noreferrer">DPA</a>
          <a href={GROWTH_OS_BRAND.legal.notice} target="_blank" rel="noopener noreferrer">{t`Legal notice`}</a>
          <a href={GROWTH_OS_LICENCES_PATH}>{t`Open-source licences`}</a>
          <a href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}>{GROWTH_OS_BRAND.supportEmail}</a>
        </footer>
      </div>
      <aside className="gos-auth-side" aria-hidden="true">
        <div>
          <p className="gos-quote">
            {t`Every deal in one place.`} <em>{t`Every next step obvious.`}</em>
          </p>
          <ul>
            <li><Check /> {t`Your own workspace and web address`}</li>
            <li><Check /> {GROWTH_OS_BRAND.hostingClaim}</li>
            <li><Check /> {t`${trialDays}-day Growth trial, no card. Then from €${fromPrice} per user / month, plus VAT.`}</li>
          </ul>
        </div>
        <div className="gos-preview-card">
          <div className="gos-pc-h">
            <b>{t`Pipeline · Nordlicht Analytics`}</b>
            <span className="gos-badge gos-badge-success">{t`€173k open`}</span>
          </div>
          <div className="gos-pc-row">
            <span className="gos-av">KV</span>
            <div><b>Katrin Vogel</b><div className="gos-sub2">{t`Kestrel Logistics · renewal review tomorrow, 10:00`}</div></div>
            <span className="gos-badge gos-badge-info">{t`Meeting`}</span>
          </div>
          <div className="gos-pc-row">
            <span className="gos-av gos-av-b">ML</span>
            <div><b>Mikael Lindqvist</b><div className="gos-sub2">{t`Fjordline Software · support plan won`}</div></div>
            <span className="gos-badge gos-badge-success">{t`Customer`}</span>
          </div>
          <div className="gos-pc-row">
            <span className="gos-av gos-av-c">SO</span>
            <div><b>Sarah Okafor</b><div className="gos-sub2">{t`Brightwater Labs · moved to Proposal`}</div></div>
            <span className="gos-badge gos-badge-warn">€28,800</span>
          </div>
        </div>
        <p className="gos-side-foot">{t`ScalePoint Ventures Oy · Finland · B2B only`}</p>
      </aside>
    </div>
  );
};

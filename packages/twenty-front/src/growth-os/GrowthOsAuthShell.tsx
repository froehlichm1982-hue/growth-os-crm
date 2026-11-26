import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  GROWTH_OS_BRAND,
  GROWTH_OS_LOGO_DARK,
  GROWTH_OS_LOGO_LIGHT,
} from '~/growth-os/brand';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';
import { GROWTH_OS_LICENCES_PATH } from '~/growth-os/licences/growthOsLicencesPath';
import {
  GROWTH_OS_SIGNED_OUT_KEY,
  growthOsTake,
} from '~/growth-os/session/growthOsSessionExpiredState';

import './growth-os-auth.css';

// Growth OS CRM auth frame on the DS v2 split layout (patterns/sign-in.html):
// art panel left (≥ 1024px), form column right with the sign-in / sign-up
// switch, the form and the legal footer. Demo data: Nordlicht Analytics only.

const IconCrm = createGosIcon('kanban-square', 'GosAuthCrm');
const IconShield = createGosIcon('shield-check', 'GosAuthShield');
const IconLock = createGosIcon('lock', 'GosAuthLock');
const IconCheck = createGosIcon('circle-check', 'GosAuthCheck');

const Logo = ({ decorative = false }: { decorative?: boolean }) => (
  <>
    <img className="gos-logo gos-logo--light" src={GROWTH_OS_LOGO_LIGHT} width={150} height={30} alt={decorative ? '' : 'ScalePoint Ventures'} />
    <img className="gos-logo gos-logo--dark" src={GROWTH_OS_LOGO_DARK} width={150} height={30} alt="" aria-hidden="true" />
  </>
);

export const GrowthOsAuthShell = ({ children }: { children: ReactNode }) => {
  const { t } = useLingui();
  const location = useLocation();
  const isSignUp = new URLSearchParams(location.search).get('mode') === 'signup';
  const isInvite = location.pathname.startsWith('/invite');
  // §4 logout: "You're signed out" toast once, after a sign-out.
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (growthOsTake(GROWTH_OS_SIGNED_OUT_KEY) !== '1') return;
    setSignedOut(true);
    const timer = window.setTimeout(() => setSignedOut(false), 6000);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="gos-auth" data-m="crm">
      <section className="gos-auth-art" aria-hidden="true">
        <Logo decorative />
        <div className="gos-auth-claim">
          <span className="gos-auth-chip">
            <span className="growth-os-mt" data-m="crm">
              <IconCrm size={14} />
            </span>
            CRM
          </span>
          <h2>
            {t`Every deal,`} <span className="gos-accent">{t`one clear view.`}</span>
          </h2>
          <p>{t`Pipeline, contacts and the next step for every deal, in one place. Set up in minutes, no card needed.`}</p>
        </div>
        <ul className="gos-auth-proof">
          <li><IconShield size={14} />{t`Hosted in the EU`}</li>
          <li><IconLock size={14} />{t`GDPR-ready`}</li>
          <li><IconCheck size={14} />{t`No card for the trial`}</li>
        </ul>
        <svg className="gos-auth-ridge" viewBox="0 0 800 400" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 400 L0 300 L250 140 L330 200 L430 90 L600 250 L680 210 L800 290 L800 400Z" />
          <path d="M0 300 L250 140 L330 200 L430 90 L600 250 L680 210 L800 290" fill="none" strokeWidth="1.2" />
        </svg>
      </section>
      <div className="gos-auth-main">
        <header className="gos-auth-top">
          <a className="gos-auth-mobile-logo" href={GROWTH_OS_BRAND.marketingUrl} aria-label={t`ScalePoint Growth OS home`}>
            <Logo decorative />
          </a>
          {isInvite ? null : isSignUp ? (
            <span>
              <span className="gos-hide-xs">{t`Already have an account?`} </span>
              <a href="/welcome">{t`Sign in`}</a>
            </span>
          ) : (
            <span>
              <span className="gos-hide-xs">{t`New here?`} </span>
              <a href="/welcome?mode=signup">{t`Create an account`}</a>
            </span>
          )}
        </header>
        <main id="main" className="gos-auth-card">
          {children}
        </main>
        <footer className="gos-auth-foot">
          <a href={GROWTH_OS_BRAND.legal.privacy} target="_blank" rel="noopener noreferrer">{t`Privacy`}</a>
          <a href={GROWTH_OS_BRAND.legal.terms} target="_blank" rel="noopener noreferrer">{t`Terms`}</a>
          <a href={GROWTH_OS_BRAND.legal.notice} target="_blank" rel="noopener noreferrer">{t`Imprint`}</a>
          <a href={GROWTH_OS_BRAND.legal.dpa} target="_blank" rel="noopener noreferrer">DPA</a>
          <a href={GROWTH_OS_LICENCES_PATH}>{t`Open-source licences`}</a>
          <span>© 2026 {GROWTH_OS_BRAND.companyName}</span>
        </footer>
        <div className="gos-toast-region" role="status" aria-live="polite">
          {signedOut && (
            <div className="gos-toast" data-testid="growth-os-signed-out-toast">
              <IconCheck size={16} />
              {t`You’re signed out`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

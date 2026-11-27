import { useLingui } from '@lingui/react/macro';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  GROWTH_OS_BRAND,
  GROWTH_OS_LOGO_DARK,
  GROWTH_OS_LOGO_LIGHT,
} from '~/growth-os/brand';
import { GrowthOsArtPipelineCard, GrowthOsArtTimelineCard } from '~/growth-os/GrowthOsAuthArt';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';
import { GROWTH_OS_LICENCES_PATH } from '~/growth-os/licences/growthOsLicencesPath';
import {
  GROWTH_OS_SIGNED_OUT_KEY,
  growthOsTake,
} from '~/growth-os/session/growthOsSessionExpiredState';

import './growth-os-auth.css';

// Growth OS CRM auth frame on the Design System v2.9 auth kit
// (patterns/auth/crm/<lang>/sign-in.html). All layout and look come from the
// CRM-scoped DS sheet (`.gos` is the <html> element, see index.html); the only
// local CSS is growth-os-auth.css (upstream glue, zoom-safe height).
// Art panel: Pipeline + Timeline demo product cards (GrowthOsAuthArt.tsx,
// Nordlicht Analytics demo data, live DOM, no photo or raster crop). Magic link and login code are not offered (owner decision).

const IconCrm = createGosIcon('kanban-square', 'GosAuthCrm');
const IconShield = createGosIcon('shield-check', 'GosAuthShield');
const IconLock = createGosIcon('lock', 'GosAuthLock');
const IconCheck = createGosIcon('circle-check', 'GosAuthCheck');

const Logos = ({ decorative = false }: { decorative?: boolean }) => (
  <>
    <img className="gos-logo gos-logo--light" src={GROWTH_OS_LOGO_LIGHT} width={150} height={30} alt={decorative ? '' : 'ScalePoint Ventures'} />
    <img className="gos-logo gos-logo--dark" src={GROWTH_OS_LOGO_DARK} width={150} height={30} alt="" aria-hidden="true" />
  </>
);

const ModChip = ({ className = '' }: { className?: string }) => (
  <span className={`mod-chip ${className}`.trim()}>
    <span className="gos-mt gos-mt--sm" data-m="crm">
      <IconCrm className="gos-icon sm" />
    </span>
    CRM
  </span>
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
    <div className="gos" data-m="crm">
    <a className="gos-skip" href="#main">{t`Skip to content`}</a>
    <div className="gos-auth growth-os-auth" data-m="crm">
      <section className="gos-auth-art" aria-hidden="true">
        <div className="aurora"><i /><i /><i /></div>
        <Logos decorative />
        <div className="claim">
          <ModChip />
          <h2>
            {t`Every deal,`} <span className="gos-accent">{t`one clear view.`}</span>
          </h2>
          <p>{t`Pipeline, contacts and the next step for every deal, in one place. Set up in minutes, no card needed.`}</p>
        </div>
        <div className="gos-auth-stage">
          <GrowthOsArtPipelineCard style={{ '--x': '2%', '--y': '2%', '--w': '42%', zIndex: 2 } as React.CSSProperties} />
          <GrowthOsArtTimelineCard style={{ '--x': '34%', '--y': '50%', '--w': '64%', zIndex: 3 } as React.CSSProperties} />
          <span className="demo">{t`Demo data · Nordlicht Analytics`}</span>
        </div>
        <ul className="proof">
          <li><IconShield className="gos-icon sm" />{t`Hosted in the EU`}</li>
          <li><IconLock className="gos-icon sm" />{t`GDPR-ready`}</li>
          <li><IconCheck className="gos-icon sm" />{t`No card for the trial`}</li>
        </ul>
      </section>
      <main className="gos-auth-main" id="main">
        <div className="gos-auth-top">
          <a className="gos-mobile-logo" style={{ marginRight: 'auto' }} href={GROWTH_OS_BRAND.marketingUrl} aria-label={t`ScalePoint Growth OS home`}>
            <Logos decorative />
          </a>
          {isInvite ? null : isSignUp ? (
            <span>
              {t`Already have an account?`} <a className="gos-link gos-tap" href="/welcome">{t`Sign in`}</a>
            </span>
          ) : (
            <span>
              {t`New here?`} <a className="gos-link gos-tap" href="/welcome?mode=signup">{t`Create an account`}</a>
            </span>
          )}
        </div>
        <div className="gos-auth-form">
          <ModChip className="gos-mobile-chip" />
          {children}
        </div>
        <div className="gos-auth-foot">
          <a className="gos-tap" href={GROWTH_OS_BRAND.legal.privacy} target="_blank" rel="noopener noreferrer">{t`Privacy`}</a>
          <a className="gos-tap" href={GROWTH_OS_BRAND.legal.terms} target="_blank" rel="noopener noreferrer">{t`Terms`}</a>
          <a className="gos-tap" href={GROWTH_OS_BRAND.legal.notice} target="_blank" rel="noopener noreferrer">{t`Imprint`}</a>
          <a className="gos-tap" href={GROWTH_OS_BRAND.legal.dpa} target="_blank" rel="noopener noreferrer">DPA</a>
          <a className="gos-tap" href={GROWTH_OS_LICENCES_PATH}>{t`Open-source licences`}</a>
          <span>© 2026 {GROWTH_OS_BRAND.companyName}</span>
        </div>
      </main>
      <div className="gos-toasts" role="status" aria-live="polite">
        {signedOut && (
          <div className="gos-toast" data-testid="growth-os-signed-out-toast">
            <IconCheck className="gos-icon" />
            <span>{t`You’re signed out`}</span>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

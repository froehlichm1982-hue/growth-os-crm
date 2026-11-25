import { styled } from '@linaria/react';
import { type ReactNode } from 'react';

import { GROWTH_OS_PRICING } from 'twenty-shared/i18n';

import { GROWTH_OS_BRAND, GROWTH_OS_LOGO_DARK } from '~/growth-os/brand';

// Growth OS CRM sign-in / onboarding frame: navy brand panel (same message,
// tokens and typography as the Growth OS CRM product page) next to the
// upstream form. Below 1024px the panel collapses to a slim navy band so the
// form stays first on phones. English-only marketing copy by design.
const BREAKPOINT = 1024;

const StyledShell = styled.div`
  background: var(--t-background-secondary);
  display: grid;
  grid-template-columns: minmax(380px, 40%) 1fr;
  height: calc(100dvh / var(--t-zoom, 1));
  width: 100%;

  @media (max-width: ${BREAKPOINT}px) {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
`;

const StyledPanel = styled.aside`
  background:
    radial-gradient(120% 70% at 0% 0%, #1c2b40 0%, transparent 60%),
    var(--spv-navy-dark);
  box-sizing: border-box;
  color: var(--spv-text-light);
  display: flex;
  flex-direction: column;
  gap: 40px;
  justify-content: space-between;
  overflow: hidden;
  padding: 48px 56px 40px;

  @media (max-width: ${BREAKPOINT}px) {
    flex-direction: row;
    gap: 16px;
    justify-content: flex-start;
    padding: 14px 20px;
  }
`;

const StyledLogo = styled.img`
  display: block;
  height: 30px;
  width: 150px;

  @media (max-width: ${BREAKPOINT}px) {
    height: 24px;
    width: 120px;
  }
`;

const StyledLabel = styled.p`
  color: var(--spv-teal-on-navy);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2em;
  margin: 0 0 16px;
  text-transform: uppercase;

  @media (max-width: ${BREAKPOINT}px) {
    border-left: 1px solid #ffffff2e;
    letter-spacing: 0.16em;
    margin: 0;
    padding-left: 16px;
  }
`;

const StyledPitch = styled.div`
  max-width: 440px;

  @media (max-width: ${BREAKPOINT}px) {
    align-items: center;
    display: flex;
  }
`;

const StyledHeadline = styled.h2`
  color: #ffffff;
  font-family: var(--spv-font-display);
  font-size: 40px;
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0 0 18px;

  @media (max-width: ${BREAKPOINT}px) {
    display: none;
  }
`;

const StyledLede = styled.p`
  color: var(--spv-navy-muted);
  font-size: 15px;
  line-height: 1.65;
  margin: 0 0 28px;

  @media (max-width: ${BREAKPOINT}px) {
    display: none;
  }
`;

const StyledChecks = styled.ul`
  display: grid;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;

  & > li {
    align-items: flex-start;
    color: var(--spv-text-light);
    display: flex;
    font-size: 14px;
    gap: 10px;
    line-height: 1.5;
  }

  & svg {
    color: var(--spv-teal-light);
    flex-shrink: 0;
    margin-top: 3px;
  }

  @media (max-width: ${BREAKPOINT}px) {
    display: none;
  }
`;

const StyledPanelFooter = styled.div`
  color: var(--spv-navy-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  gap: 6px 16px;

  & > a {
    color: inherit;
    text-decoration: none;

    &:hover {
      color: #ffffff;
      text-decoration: underline;
    }
  }

  @media (max-width: ${BREAKPOINT}px) {
    display: none;
  }
`;

const StyledOffer = styled.div`
  border-top: 1px solid #ffffff1f;
  margin-top: 28px;
  padding-top: 24px;

  @media (max-width: ${BREAKPOINT}px) {
    display: none;
  }
`;

const StyledTrialPill = styled.p`
  background: #46918926;
  border: 1px solid #6bc7be55;
  border-radius: 999px;
  color: var(--spv-teal-light);
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 16px;
  padding: 4px 12px;
`;

const StyledPriceRows = styled.ul`
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 0 0 12px;
  padding: 0;

  & > li {
    align-items: baseline;
    display: flex;
    font-size: 14px;
    gap: 12px;
    justify-content: space-between;
  }

  & strong {
    color: #ffffff;
    font-weight: 600;
  }

  & .growth-os-price {
    color: var(--spv-text-light);
    white-space: nowrap;
  }

  & .growth-os-price small {
    color: var(--spv-navy-muted);
    font-size: 12px;
  }

  & .growth-os-hint {
    color: var(--spv-navy-muted);
    flex: 1;
    font-size: 12px;
  }
`;

const StyledOfferNote = styled.p`
  color: var(--spv-navy-muted);
  font-size: 12px;
  margin: 0;

  & > a {
    color: var(--spv-teal-light);
  }
`;

const StyledMobileOffer = styled.p`
  display: none;

  @media (max-width: ${BREAKPOINT}px) {
    background: #46918914;
    border-bottom: 1px solid #46918933;
    color: var(--t-font-color-primary);
    display: block;
    font-size: 13px;
    line-height: 1.45;
    margin: 0;
    padding: 10px 20px;
    text-align: center;

    & strong {
      color: #3a7872;
    }
  }
`;

const StyledContent = styled.main`
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  position: relative;

  /* The brand panel / mobile band already carries the logo. */
  & .growth-os-wordmark {
    display: none;
  }

  @media (max-width: ${BREAKPOINT}px) {
    flex: 1;
    overflow: visible;
  }
`;

const Check = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M13.3 4.3L6.5 11.1 3 7.6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GrowthOsAuthShell = ({ children }: { children: ReactNode }) => (
  <StyledShell>
    <StyledPanel aria-label={GROWTH_OS_BRAND.productName}>
      <a href={GROWTH_OS_BRAND.marketingUrl} aria-label="ScalePoint Ventures">
        <StyledLogo src={GROWTH_OS_LOGO_DARK} alt="ScalePoint Ventures" />
      </a>
      <StyledPitch>
        <StyledLabel>{GROWTH_OS_BRAND.productName}</StyledLabel>
        <StyledHeadline>A fast B2B CRM your team owns.</StyledHeadline>
        <StyledLede>
          Companies, people and pipelines in one isolated workspace for your
          team, with custom objects, workflows and full API access.
        </StyledLede>
        <StyledChecks>
          <li>
            <Check /> Your own isolated workspace and subdomain
          </li>
          <li>
            <Check /> Custom pipelines, objects, workflows and API
          </li>
          <li>
            <Check /> {GROWTH_OS_BRAND.hostingClaim}
          </li>
        </StyledChecks>
        <StyledOffer aria-label="Pricing">
          <StyledTrialPill>
            {GROWTH_OS_PRICING.trialDays}-day Growth trial · no card required
          </StyledTrialPill>
          <StyledPriceRows>
            {GROWTH_OS_PRICING.plans.map((entry) => (
              <li key={entry.plan}>
                <strong>{entry.label}</strong>
                <span className="growth-os-hint">
                  {entry.plan === 'starter'
                    ? 'up to 3 users, 1 pipeline'
                    : entry.plan === 'growth'
                      ? 'mail sync, workflows, API'
                      : 'unlimited users, AI'}
                </span>
                <span className="growth-os-price">
                  €{entry.priceMonthlyEur} <small>/ user / month</small>
                </span>
              </li>
            ))}
          </StyledPriceRows>
          <StyledOfferNote>
            Net prices excl. VAT · yearly billing = 2 months free ·{' '}
            <a
              href={`${GROWTH_OS_BRAND.marketingUrl}#pricing`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Compare plans
            </a>
          </StyledOfferNote>
        </StyledOffer>
      </StyledPitch>
      <StyledPanelFooter>
        <span>© {GROWTH_OS_BRAND.companyLegalName}</span>
        <a href={GROWTH_OS_BRAND.legal.terms} target="_blank" rel="noopener noreferrer">
          Terms
        </a>
        <a href={GROWTH_OS_BRAND.legal.privacy} target="_blank" rel="noopener noreferrer">
          Privacy
        </a>
        <a href={GROWTH_OS_BRAND.legal.dpa} target="_blank" rel="noopener noreferrer">
          DPA
        </a>
        <a href={GROWTH_OS_BRAND.legal.notice} target="_blank" rel="noopener noreferrer">
          Legal notice
        </a>
        <a href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}>Support</a>
      </StyledPanelFooter>
    </StyledPanel>
    <StyledContent>
      <StyledMobileOffer>
        <strong>{GROWTH_OS_PRICING.trialDays}-day Growth trial, no card.</strong>{' '}
        Then from €{GROWTH_OS_PRICING.plans[0].priceMonthlyEur} per user / month
        (net).
      </StyledMobileOffer>
      {children}
    </StyledContent>
  </StyledShell>
);

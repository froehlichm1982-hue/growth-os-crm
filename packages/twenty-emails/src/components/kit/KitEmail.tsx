import { type I18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GROWTH_OS_BRAND } from 'twenty-shared/i18n';
import { type APP_LOCALES } from 'twenty-shared/translations';

import { createI18nInstance } from 'src/utils/i18n.utils';

import {
  GOS_BILLING_PORTAL,
  GOS_MAIL_BASE_HTML,
  GOS_MAIL_CRM,
  GOS_MAIL_LEGAL,
  GOS_MAIL_STRINGS,
  GOS_MAIL_TERMS_LIVE,
} from 'src/gos/emailBaseV3.generated';
import {
  type MailCardSpec,
  type MailChipTone,
  escapeMailHtml,
  mailProductCard,
} from 'src/gos/emailCardsV3';

// Growth OS mail base v3 (DS v2.8, design-system/email/EMAIL-BASE.md): header
// art as CID image (light/dark swap), eyebrow "CRM · Topic" with the module dot,
// 27/34 H1, 16/26 body, product cards, a navy 48px CTA with a fallback link,
// info box, support line, footer with reason, company and live legal links.
// The shell is the DS base.html filled with the CRM module slots (see
// quality-gate/tools/sync-email-base.mjs); the Kit* parts below render the
// body in the same markup. CRM violet is only the header, eyebrow, avatar,
// chip, meter and info edge. Buttons stay navy.

export { GOS_BILLING_PORTAL };

// Demo only (previews, samples): same shape as the signed portal link, fake signature.
export const GOS_DEMO_PORTAL_LINK = `${GOS_BILLING_PORTAL}?a=acc_demo&m=crm&exp=1796000000&sig=${'0'.repeat(64)}`;

export type KitReason = 'security' | 'account' | 'billing' | 'invite' | 'product' | 'admin' | 'test';

const PORTAL_HOST = new URL(GOS_BILLING_PORTAL).host;

type KitEmailProps = {
  locale: keyof typeof APP_LOCALES;
  // Browser/tab title and a11y title; also used by previews.
  title: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  reason: KitReason;
  children: ReactNode;
  // Optional forced scheme for screenshots ('dark' applies the dark classes).
  previewScheme?: 'light' | 'dark';
};

export const kitReasonLine = (i18n: I18n, reason: KitReason) => {
  switch (reason) {
    case 'security':
      return i18n._('This is a security email. We send it even if you’ve turned off product emails.');
    case 'billing':
      return i18n._('You get this email because you manage billing for this workspace.');
    case 'invite':
      return i18n._('You get this email because a teammate invited you. If you weren’t expecting it, you can ignore it.');
    case 'admin':
      return i18n._('You get this email because your server administrator access changed.');
    case 'product':
      return i18n._('You get this email because you use ScalePoint Growth OS. It is about your workspace, not marketing.');
    case 'test':
      return i18n._('This is a test email sent from your workspace settings.');
    default:
      return i18n._('You get this email because you have a ScalePoint Growth OS account.');
  }
};

// Mustache-lite, same rules as email.mjs fill(): {{{raw}}}, {{escaped}}, {{#flag}}..{{/flag}}.
const fill = (template: string, values: Record<string, unknown>) =>
  template
    .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, key: string, inner: string) =>
      values[key] ? inner : '',
    )
    .replace(/\{\{\{(\w+)\}\}\}/g, (_m, key: string) => String(values[key] ?? ''))
    .replace(/\{\{(\w+)\}\}/g, (_m, key: string) => escapeMailHtml(values[key]));

const headerSrc = (variant: 'light' | 'dark') =>
  process.env.EMAIL_ASSET_MODE === 'url'
    ? `${GROWTH_OS_BRAND.appUrl}/images/growth-os/email-header-crm-${variant}@2x.png`
    : `cid:header-crm-${variant}@crm.scalepoint`;

export const KitEmail = ({
  locale,
  title,
  preheader,
  eyebrow,
  heading,
  reason,
  children,
  previewScheme,
}: KitEmailProps) => {
  const i18n = createI18nInstance(locale);
  const lang = (String(locale).split('-')[0] === 'de' ? 'de' : 'en') as 'en' | 'de';
  const legal = GOS_MAIL_LEGAL[lang];
  const strings = GOS_MAIL_STRINGS[lang];
  const mod = GOS_MAIL_CRM;
  const body = renderToStaticMarkup(
    <I18nProvider i18n={i18n}>{children}</I18nProvider>,
  );

  let html = fill(GOS_MAIL_BASE_HTML, {
    lang,
    ...strings,
    subject: title,
    preheader,
    eyebrow: `CRM · ${eyebrow}`,
    title: heading,
    body,
    card: false,
    cta: false,
    info: false,
    unsub: false,
    c_link: '#0B6E66',
    m_fill: mod.fill,
    m_ink: mod.ink,
    m_soft: mod.soft,
    m_dark_ink: mod.darkInk,
    m_dark_fill: mod.darkFill,
    header_light: 'header-crm-light@2x.png',
    header_dark: 'header-crm-dark@2x.png',
    header_alt: 'ScalePoint Growth OS CRM',
    footer_reason: kitReasonLine(i18n, reason),
    terms: GOS_MAIL_TERMS_LIVE,
    legal_terms: legal.terms[0],
    legal_terms_url: legal.terms[1],
    legal_privacy: legal.privacy[0],
    legal_privacy_url: legal.privacy[1],
    legal_notice: legal.notice[0],
    legal_notice_url: legal.notice[1],
  });

  html = html
    .split('src="assets/header-crm-light@2x.png"')
    .join(`src="${headerSrc('light')}"`)
    .split('src="assets/header-crm-dark@2x.png"')
    .join(`src="${headerSrc('dark')}"`);

  if (previewScheme === 'dark') {
    html = html.replace('@media (prefers-color-scheme:dark){', '@media all{');
  }

  // The DS base is a whole document: the root <html> keeps its attributes, the
  // rest goes in as markup so VML/MSO comments and the body class stay intact.
  const inner = html.slice(html.indexOf('<head>'), html.lastIndexOf('</html>'));

  return (
    <html
      lang={lang}
      dir="ltr"
      {...({
        xmlns: 'http://www.w3.org/1999/xhtml',
        'xmlns:v': 'urn:schemas-microsoft-com:vml',
        'xmlns:o': 'urn:schemas-microsoft-com:office:office',
      } as Record<string, string>)}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
};

export const escapeHtml = escapeMailHtml;

const F = "Geist,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const KitText = ({ children }: { children: ReactNode }) => (
  <p className="t2" style={{ margin: '0 0 16px' }}>{children}</p>
);

export const KitStrong = ({ children }: { children: ReactNode }) => (
  <b className="tx" style={{ color: '#111E32', fontWeight: 600 }}>{children}</b>
);

const vmlWidth = (label: string) =>
  Math.min(520, Math.max(180, Math.round(label.length * 9.2 + 76)));

// DS v3 CTA: navy 48px button, arrow, VML roundrect for Outlook.
export const KitButton = ({ href, label }: { href: string; label: string }) => {
  const safeHref = escapeMailHtml(href);
  const safeLabel = escapeMailHtml(label);
  const html =
    `<tr><td align="center" bgcolor="#111E32" style="border-radius:10px">` +
    `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:48px;v-text-anchor:middle;width:${vmlWidth(label)}px" arcsize="21%" stroke="f" fillcolor="#111E32"><w:anchorlock/><center style="color:#FFFFFF;font-family:'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:bold">${safeLabel}&nbsp;&rarr;</center></v:roundrect><![endif]-->` +
    `<!--[if !mso]><!--><a class="btn" href="${safeHref}" style="display:inline-block;background:#111E32;color:#FFFFFF;border:1px solid #111E32;font-family:${F};font-size:16px;line-height:48px;font-weight:600;text-decoration:none;padding:0 28px;border-radius:10px;mso-hide:all">${safeLabel}&nbsp;&rarr;</a><!--<![endif]-->` +
    `</td></tr>`;

  return (
    <table role="presentation" className="btnt" cellPadding={0} cellSpacing={0} style={{ margin: '22px 0 18px' }}>
      <tbody dangerouslySetInnerHTML={{ __html: html }} />
    </table>
  );
};

export const KitFallbackLink = ({ href, i18n }: { href: string; i18n: I18n }) => {
  const lang = String(i18n.locale).startsWith('de') ? 'de' : 'en';

  return (
    <p className="mu" style={{ margin: '0 0 20px', fontFamily: F, fontSize: 13, lineHeight: '20px', color: '#4A5566' }}>
      {GOS_MAIL_STRINGS[lang].t_fallback}
      <br />
      <a className="lk" href={href} style={{ color: '#0B6E66', textDecoration: 'underline', wordBreak: 'break-all' }}>{href}</a>
    </p>
  );
};

// DS info box: 4px edge in the module hue (violet), danger/warning edges for status.
export const KitNote = ({ children, tone = 'neutral', title }: { children: ReactNode; tone?: 'neutral' | 'danger' | 'warn'; title?: string }) => {
  const edge = tone === 'danger' ? '#D92D20' : tone === 'warn' ? '#F2A40E' : GOS_MAIL_CRM.fill;

  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: '6px 0 26px', borderCollapse: 'separate' }}>
      <tbody>
        <tr>
          <td
            className="ib"
            {...({ bgcolor: '#F4F7FB' } as Record<string, string>)}
            style={{ background: '#F4F7FB', border: '1px solid #DCE3EC', borderLeft: `4px solid ${edge}`, borderRadius: 12, padding: '14px 18px', fontFamily: F, fontSize: 14, lineHeight: '22px', fontWeight: 400, color: '#3C4656' }}
          >
            {title ? (
              <>
                <b className="tx" style={{ color: '#111E32', fontWeight: 600 }}>{title}</b>
                <br />
              </>
            ) : null}
            <span className="t2" style={{ color: '#3C4656' }}>{children}</span>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

const CardHtml = ({ html }: { html: string }) => (
  <div style={{ margin: '18px 0 8px' }} dangerouslySetInnerHTML={{ __html: html }} />
);

// Rows-only card (what the old details table was): label left, value right.
export const KitDetails = ({ rows }: { rows: Array<[string, ReactNode]> }) => (
  <CardHtml html={mailProductCard({ rows: rows.map(([label, value]) => [label, String(value)]) })} />
);

export const KitCard = ({ spec }: { spec: MailCardSpec }) => (
  <CardHtml html={mailProductCard(spec)} />
);

// DS v3 invoice card: plan + invoice number, status chip, line, total, note.
export const KitInvoiceCard = ({
  plan,
  invoiceNumber,
  status,
  tone = 'danger',
  line,
  amount,
  totalLabel,
  total,
  note,
  rows,
}: {
  plan: string;
  invoiceNumber?: string;
  status: string;
  tone?: MailChipTone;
  line?: string;
  amount?: string;
  totalLabel?: string;
  total?: string;
  note?: string;
  rows?: Array<[string, string]>;
}) => (
  <CardHtml
    html={mailProductCard({
      title: plan,
      sub: invoiceNumber,
      chip: { label: status, tone },
      rows: [...(line && amount ? ([[line, amount]] as Array<[string, string]>) : []), ...(rows ?? [])],
      total: totalLabel && total ? [totalLabel, total] : undefined,
      note,
    })}
  />
);

// DS v3 deal card: initials avatar, deal + company, stage chip, stage meter.
export const KitDealCard = ({
  initials,
  deal,
  company,
  stage,
  steps,
  active,
  rows,
  demo,
}: {
  initials: string;
  deal: string;
  company?: string;
  stage: string;
  steps: string[];
  active: number;
  rows?: Array<[string, string]>;
  demo?: string;
}) => (
  <CardHtml
    html={mailProductCard({
      initials,
      title: deal,
      sub: company,
      chip: { label: stage, tone: 'module' },
      meter: { steps, active },
      rows,
      demo,
    })}
  />
);

// Billing links only go through the signed portal (billing-service/docs/integration/portal-link.md).
export const isKitPortalLink = (href: string) => {
  try {
    return new URL(href).host === PORTAL_HOST;
  } catch {
    return false;
  }
};

export const kitI18n = (locale: keyof typeof APP_LOCALES) => createI18nInstance(locale);

export const kitFormatDate = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale === 'en' || locale === 'pseudo-en' ? 'en-GB' : locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);

// ms(..., { long: true }) output is English ("60 minutes"); localize the
// few units we use so German mails read naturally.
export const kitLocalizeDuration = (duration: string, locale: string) => {
  if (!String(locale).startsWith('de')) return duration;

  return duration
    .replace(/\bminutes?\b/, (unit) => (unit === 'minute' ? 'Minute' : 'Minuten'))
    .replace(/\bhours?\b/, (unit) => (unit === 'hour' ? 'Stunde' : 'Stunden'))
    .replace(/\bdays?\b/, (unit) => (unit === 'day' ? 'Tag' : 'Tage'));
};

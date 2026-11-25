import { type I18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { type CSSProperties, type ReactNode } from 'react';
import { GROWTH_OS_BRAND } from 'twenty-shared/i18n';
import { type APP_LOCALES } from 'twenty-shared/translations';

import { createI18nInstance } from 'src/utils/i18n.utils';

// Growth OS shared email template (product standard §6, reference-kit/emails):
// 600px, #F5F7F9 canvas, white 16px card, eyebrow, DM Serif H1 30/36, one
// navy bulletproof CTA with a fallback link, a note box, reason + support +
// company footer, dark-mode classes and a logo swap, hidden preheader.

export const KIT = {
  canvas: '#F5F7F9',
  card: '#FFFFFF',
  line: '#E4E9EF',
  ink: '#111E32',
  ink2: '#3B4A5E',
  ink3: '#5A687C',
  link: '#3A7872',
  danger: '#B42318',
  dangerSoft: '#FEF3F2',
  warnSoft: '#FFFAEB',
  warn: '#93370D',
  font: "Inter,'Segoe UI',Helvetica,Arial,sans-serif",
  serif: "'DM Serif Display',Georgia,'Times New Roman',serif",
} as const;

export type KitReason = 'security' | 'account' | 'billing' | 'invite' | 'product' | 'admin' | 'test';

const KIT_STYLE = `
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
a{text-decoration:underline} .btn:hover{background:#09101B!important}
.logo-dark{display:none;max-height:0;overflow:hidden;mso-hide:all}
@media (max-width:520px){.card{border-radius:0!important;border-left:0!important;border-right:0!important;padding:32px 24px!important} .pad{padding-left:24px!important;padding-right:24px!important} h1{font-size:26px!important;line-height:32px!important} .btn{display:block!important;text-align:center!important;height:auto!important;line-height:22px!important;padding:13px 20px!important} .outer{padding:24px 0!important}}
@media (prefers-color-scheme:dark){
 .bg{background:#0B1320!important} .card{background:#111E32!important;border-color:#24344B!important}
 .t1,h1{color:#F3F5F7!important} .t2{color:#C9D2DD!important} .t3{color:#9FADBE!important} .lk{color:#59C0B6!important}
 .bd{border-color:#24344B!important} .box{background:#1C2B40!important;color:#C9D2DD!important} .eb{color:#59C0B6!important}
 .boxd{background:#3A1714!important;color:#FDA29B!important} .boxw{background:#3A2A0C!important;color:#FEC84B!important}
 .btn{background:#FFFFFF!important;color:#111E32!important}
 .logo-light{display:none!important} .logo-dark{display:block!important;max-height:none!important}
}
[data-ogsc] .t1,[data-ogsc] h1{color:#F3F5F7!important} [data-ogsc] .t2{color:#C9D2DD!important} [data-ogsc] .lk{color:#59C0B6!important}
[data-ogsb] .card{background:#111E32!important} [data-ogsb] .bg{background:#0B1320!important}
`;

const PREHEADER_PAD = '&#8199;&#65279;&#847;'.repeat(12);

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
  const lang = String(locale).split('-')[0];
  const logo = (variant: 'light' | 'dark') =>
    `${GROWTH_OS_BRAND.appUrl}/images/growth-os/logo-${variant}@2x.png`;
  const style = previewScheme === 'dark'
    ? KIT_STYLE.replace('@media (prefers-color-scheme:dark){', '@media all{')
    : KIT_STYLE;

  return (
    <I18nProvider i18n={i18n}>
      <html lang={lang}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <meta name="x-apple-disable-message-reformatting" />
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />
          <title>{title}</title>
          <style dangerouslySetInnerHTML={{ __html: style }} />
        </head>
        <body className="bg" style={{ margin: 0, padding: 0, background: KIT.canvas }}>
          <div
            style={{ display: 'none', maxHeight: 0, overflow: 'hidden', fontSize: 1, lineHeight: '1px', color: KIT.canvas }}
            dangerouslySetInnerHTML={{ __html: `${escapeHtml(preheader)}${PREHEADER_PAD}` }}
          />
          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} className="bg" style={{ background: KIT.canvas }}>
            <tbody>
              <tr>
                <td align="center" className="outer" style={{ padding: '40px 16px' }}>
                  <table role="presentation" width={600} cellPadding={0} cellSpacing={0} style={{ width: '100%', maxWidth: 600 }}>
                    <tbody>
                      <tr>
                        <td className="pad" style={{ padding: '0 8px 20px' }}>
                          <img className="logo-light" src={logo('light')} width={140} height={28} alt="ScalePoint Growth OS" style={{ display: 'block', border: 0, height: 28, width: 140 }} />
                          <div className="logo-dark">
                            <img src={logo('dark')} width={140} height={28} alt="ScalePoint Growth OS" style={{ display: 'block', border: 0, height: 28, width: 140 }} />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="card" style={{ background: KIT.card, border: `1px solid ${KIT.line}`, borderRadius: 16, padding: '40px 48px', fontFamily: KIT.font }}>
                          <p className="eb" style={{ margin: '0 0 12px', fontSize: 12, lineHeight: '16px', letterSpacing: '1.6px', textTransform: 'uppercase', fontWeight: 600, color: KIT.link }}>
                            {eyebrow}
                          </p>
                          <h1 style={{ margin: '0 0 16px', fontFamily: KIT.serif, fontWeight: 400, fontSize: 30, lineHeight: '36px', letterSpacing: '-0.4px', color: KIT.ink }}>
                            {heading}
                          </h1>
                          {children}
                        </td>
                      </tr>
                      <tr>
                        <td className="pad" style={{ padding: '24px 8px 0', fontFamily: KIT.font, fontSize: 12, lineHeight: '19px', color: KIT.ink3 }}>
                          <p className="t3" style={{ margin: '0 0 8px' }}>{kitReasonLine(i18n, reason)}</p>
                          <p className="t3" style={{ margin: '0 0 8px' }}>
                            {i18n._('Questions? Reply to this email or write to')}{' '}
                            <a className="lk" href={`mailto:${GROWTH_OS_BRAND.supportEmail}`} style={{ color: KIT.link }}>{GROWTH_OS_BRAND.supportEmail}</a>.
                          </p>
                          <p className="t3" style={{ margin: 0 }}>
                            ScalePoint Ventures Oy · Almavägen 26, 65610 Mustasaari, Finland · {i18n._('Business ID')} 3620767-9
                            <br />
                            <a className="lk" href={GROWTH_OS_BRAND.legal.terms} style={{ color: KIT.link }}>{i18n._('Terms')}</a>
                            {' · '}
                            <a className="lk" href={GROWTH_OS_BRAND.legal.privacy} style={{ color: KIT.link }}>{i18n._('Privacy')}</a>
                            {' · '}
                            <a className="lk" href={GROWTH_OS_BRAND.legal.notice} style={{ color: KIT.link }}>{i18n._('Legal notice')}</a>
                            {GROWTH_OS_BRAND.sourceCodeUrl ? (
                              <>
                                {' · '}
                                <a className="lk" href={GROWTH_OS_BRAND.sourceCodeUrl} style={{ color: KIT.link }}>{i18n._('Source code (AGPL-3.0)')}</a>
                              </>
                            ) : null}
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    </I18nProvider>
  );
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const textStyle: CSSProperties = { margin: '0 0 16px', fontSize: 16, lineHeight: '26px', color: KIT.ink2 };

export const KitText = ({ children }: { children: ReactNode }) => (
  <p className="t2" style={textStyle}>{children}</p>
);

export const KitStrong = ({ children }: { children: ReactNode }) => (
  <b className="t1" style={{ color: KIT.ink }}>{children}</b>
);

// Bulletproof button: VML roundrect for Outlook, a styled link elsewhere.
export const KitButton = ({ href, label, width = 260 }: { href: string; label: string; width?: number }) => {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  const html =
    `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:48px;v-text-anchor:middle;width:${width}px;" arcsize="17%" stroke="f" fillcolor="#111E32"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${safeLabel}</center></v:roundrect><![endif]-->` +
    `<!--[if !mso]><!-- --><a href="${safeHref}" class="btn" style="display:inline-block;background:#111E32;color:#ffffff;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;line-height:48px;height:48px;padding:0 28px;border-radius:8px;text-decoration:none;mso-hide:all">${safeLabel}</a><!--<![endif]-->`;

  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '8px 0 24px' }}>
      <tbody>
        <tr>
          <td dangerouslySetInnerHTML={{ __html: html }} />
        </tr>
      </tbody>
    </table>
  );
};

export const KitFallbackLink = ({ href, i18n }: { href: string; i18n: I18n }) => (
  <p className="t3" style={{ margin: '0 0 24px', fontSize: 13, lineHeight: '20px', color: KIT.ink3 }}>
    {i18n._('Button not working? Paste this link into your browser:')}
    <br />
    <a href={href} className="lk" style={{ color: KIT.link, wordBreak: 'break-all' }}>{href}</a>
  </p>
);

export const KitNote = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' | 'warn' }) => {
  const toneStyle =
    tone === 'danger'
      ? { background: KIT.dangerSoft, color: KIT.danger }
      : tone === 'warn'
        ? { background: KIT.warnSoft, color: KIT.warn }
        : { background: KIT.canvas, color: KIT.ink2 };

  return (
    <p
      className={tone === 'danger' ? 'boxd' : tone === 'warn' ? 'boxw' : 't2 box'}
      style={{ margin: '0 0 16px', padding: '14px 16px', borderRadius: 8, fontSize: 14, lineHeight: '22px', ...toneStyle }}
    >
      {children}
    </p>
  );
};

export const KitDetails = ({ rows }: { rows: Array<[string, ReactNode]> }) => (
  <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} className="bd" style={{ margin: '0 0 24px', borderBottom: `1px solid ${KIT.line}` }}>
    <tbody>
      {rows.map(([label, value]) => (
        <tr key={label}>
          <td className="t3 bd" style={{ padding: '10px 0', borderTop: `1px solid ${KIT.line}`, fontSize: 14, color: KIT.ink3 }}>{label}</td>
          <td align="right" className="t1 bd" style={{ padding: '10px 0', borderTop: `1px solid ${KIT.line}`, fontSize: 14, fontWeight: 600, color: KIT.ink }}>{value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

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

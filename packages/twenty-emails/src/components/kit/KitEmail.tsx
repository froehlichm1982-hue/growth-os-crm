import { type I18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { type CSSProperties, type ReactNode } from 'react';
import { GROWTH_OS_BRAND } from 'twenty-shared/i18n';
import { type APP_LOCALES } from 'twenty-shared/translations';

import { createI18nInstance } from 'src/utils/i18n.utils';

import { GOS_EMAIL } from 'src/gos/tokensEmail.generated';

// Growth OS email base, DS v2.5 (design-system/email/base.html): 600px card on
// the warm canvas, DS header art (light/dark swap), Geist, eyebrow, 26/32 H1,
// one navy bulletproof CTA with a fallback link, an info box with an accent
// edge, reason + support + company footer inside the card, dark-mode classes,
// hidden preheader. All colours come from DS generated/tokens.email.json.

const L = GOS_EMAIL.light;
const D = GOS_EMAIL.dark;

export const KIT = {
  canvas: L.bg,
  card: L.card,
  line: L.line,
  ink: L.text,
  ink2: L.text2,
  ink3: L.muted,
  link: L.link,
  eyebrow: L.eyebrow,
  button: L.button,
  buttonText: L.buttonText,
  info: L.info,
  code: L.code,
  font: GOS_EMAIL.font,
  mono: GOS_EMAIL.mono,
  edgeInfo: GOS_EMAIL.edge.light.info,
  edgeDanger: GOS_EMAIL.edge.light.danger,
  edgeWarn: GOS_EMAIL.edge.light.warning,
} as const;

export type KitReason = 'security' | 'account' | 'billing' | 'invite' | 'product' | 'admin' | 'test';

const KIT_STYLE = `
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
a{text-decoration:underline} img{-ms-interpolation-mode:bicubic}
.hdr-d{display:none;max-height:0;overflow:hidden;mso-hide:all}
@media (max-width:620px){.card{border-radius:0!important} .pad{padding:24px 22px!important} .ft{padding:18px 22px 26px!important} .hdr,.hdr img{border-radius:0!important} .ctat{width:100%!important} .btn{display:block!important;text-align:center!important} .outer{padding:0!important} h1{font-size:24px!important;line-height:30px!important}}
@media (prefers-color-scheme:dark){
 .bg{background:${D.bg}!important} .card{background:${D.card}!important;border-color:${D.line}!important}
 .t1,h1{color:${D.text}!important} .t2{color:${D.text2}!important} .t3,.ft{color:${D.muted}!important} .lk{color:${D.link}!important} .eb{color:${D.eyebrow}!important}
 .bd{border-color:${D.line}!important} .box{background:${D.info}!important;border-top-color:${D.line}!important;border-right-color:${D.line}!important;border-bottom-color:${D.line}!important;color:${D.text2}!important}
 .boxd,.boxw{background:${D.info}!important;border-top-color:${D.line}!important;border-right-color:${D.line}!important;border-bottom-color:${D.line}!important;color:${D.text}!important}
 .btn{background:${D.button}!important;color:${D.buttonText}!important}
 .hdr{background:${D.bg}!important} .hdr-l{display:none!important} .hdr-d{display:block!important;max-height:none!important}
}
[data-ogsc] .t1,[data-ogsc] h1{color:${D.text}!important} [data-ogsc] .t2{color:${D.text2}!important} [data-ogsc] .lk,[data-ogsc] .eb{color:${D.link}!important}
[data-ogsb] .card{background:${D.card}!important} [data-ogsb] .bg{background:${D.bg}!important}
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

const legalUrl = (url: string, lang: string) =>
  lang === 'de' ? url.replace('/growthos/legal/', '/de/growthos/legal/') : url;

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
  const header = (variant: 'light' | 'dark') =>
    `${GROWTH_OS_BRAND.appUrl}/images/growth-os/email-header-${variant}@2x.png`;
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
                <td align="center" className="outer" style={{ padding: '32px 12px' }}>
                  <table role="presentation" width={600} cellPadding={0} cellSpacing={0} className="card" style={{ width: '100%', maxWidth: 600, background: KIT.card, border: `1px solid ${KIT.line}`, borderRadius: GOS_EMAIL.radius.card }}>
                    <tbody>
                      <tr>
                        <td className="hdr" style={{ padding: 0, borderRadius: `${GOS_EMAIL.radius.card} ${GOS_EMAIL.radius.card} 0 0`, overflow: 'hidden', background: KIT.canvas }}>
                          <img className="hdr-l" src={header('light')} width={600} height={120} alt="ScalePoint Ventures" style={{ display: 'block', width: '100%', maxWidth: 600, height: 'auto', border: 0, borderRadius: `${GOS_EMAIL.radius.card} ${GOS_EMAIL.radius.card} 0 0` }} />
                          <div className="hdr-d">
                            <img src={header('dark')} width={600} height={120} alt="" style={{ display: 'block', width: '100%', maxWidth: 600, height: 'auto', border: 0, borderRadius: `${GOS_EMAIL.radius.card} ${GOS_EMAIL.radius.card} 0 0` }} />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="pad" style={{ padding: '32px 40px 8px', fontFamily: KIT.font }}>
                          <p className="eb" style={{ margin: '0 0 10px', fontSize: 12, lineHeight: '16px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, color: KIT.eyebrow }}>
                            {eyebrow}
                          </p>
                          <h1 style={{ margin: '0 0 12px', fontFamily: KIT.font, fontWeight: 600, fontSize: 26, lineHeight: '32px', letterSpacing: '-.02em', color: KIT.ink }}>
                            {heading}
                          </h1>
                          {children}
                        </td>
                      </tr>
                      <tr>
                        <td className="ft" style={{ padding: '22px 40px 30px', fontFamily: KIT.font, fontSize: 12, lineHeight: '18px', color: KIT.ink3 }}>
                          <p className="t3" style={{ margin: '0 0 8px' }}>{kitReasonLine(i18n, reason)}</p>
                          <p className="t3" style={{ margin: '0 0 12px' }}>
                            {i18n._('Questions? Reply to this email or write to')}{' '}
                            <a className="lk" href={`mailto:${GROWTH_OS_BRAND.supportEmail}`} style={{ color: KIT.link }}>{GROWTH_OS_BRAND.supportEmail}</a>.
                          </p>
                          <p className="t3" style={{ margin: 0 }}>
                            ScalePoint Ventures Oy · Almavägen 26, 65610 Mustasaari, Finland · {i18n._('Business ID')} 3620767-9
                            <br />
                            <a className="lk" href={legalUrl(GROWTH_OS_BRAND.legal.terms, lang)} style={{ color: KIT.link }}>{i18n._('Terms')}</a>
                            {' · '}
                            <a className="lk" href={legalUrl(GROWTH_OS_BRAND.legal.privacy, lang)} style={{ color: KIT.link }}>{i18n._('Privacy')}</a>
                            {' · '}
                            <a className="lk" href={legalUrl(GROWTH_OS_BRAND.legal.notice, lang)} style={{ color: KIT.link }}>{i18n._('Legal notice')}</a>
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

const textStyle: CSSProperties = { margin: '0 0 16px', fontSize: 15, lineHeight: '24px', color: KIT.ink2 };

export const KitText = ({ children }: { children: ReactNode }) => (
  <p className="t2" style={textStyle}>{children}</p>
);

export const KitStrong = ({ children }: { children: ReactNode }) => (
  <b className="t1" style={{ color: KIT.ink }}>{children}</b>
);

// Bulletproof button (DS base): VML roundrect for Outlook, a styled link elsewhere.
export const KitButton = ({ href, label, width = 240 }: { href: string; label: string; width?: number }) => {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  const html =
    `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:46px;v-text-anchor:middle;width:${width}px;" arcsize="22%" stroke="f" fillcolor="${KIT.button}"><w:anchorlock/><center style="color:${KIT.buttonText};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${safeLabel}</center></v:roundrect><![endif]-->` +
    `<!--[if !mso]><!-- --><a href="${safeHref}" class="btn" style="display:inline-block;background:${KIT.button};color:${KIT.buttonText};font-family:${KIT.font.replace(/"/g, "'")};font-size:15px;font-weight:600;line-height:46px;height:46px;padding:0 26px;border-radius:${GOS_EMAIL.radius.button};text-decoration:none;mso-hide:all">${safeLabel}</a><!--<![endif]-->`;

  return (
    <table role="presentation" className="ctat" cellPadding={0} cellSpacing={0} style={{ margin: '8px 0 22px' }}>
      <tbody>
        <tr>
          <td dangerouslySetInnerHTML={{ __html: html }} />
        </tr>
      </tbody>
    </table>
  );
};

export const KitFallbackLink = ({ href, i18n }: { href: string; i18n: I18n }) => (
  <p className="t3" style={{ margin: '0 0 16px', fontSize: 13, lineHeight: '20px', color: KIT.ink3 }}>
    {i18n._('Button not working? Paste this link into your browser:')}
    <br />
    <a href={href} className="lk" style={{ color: KIT.link, wordBreak: 'break-all' }}>{href}</a>
  </p>
);

// DS info box: warm surface, hairline, 3px status edge (info / danger / warning).
export const KitNote = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' | 'warn' }) => {
  const edge = tone === 'danger' ? KIT.edgeDanger : tone === 'warn' ? KIT.edgeWarn : KIT.edgeInfo;

  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: '4px 0 20px' }}>
      <tbody>
        <tr>
          <td
            className={tone === 'danger' ? 'boxd' : tone === 'warn' ? 'boxw' : 'box'}
            style={{ background: KIT.info, border: `1px solid ${KIT.line}`, borderLeft: `3px solid ${edge}`, borderRadius: GOS_EMAIL.radius.box, padding: '14px 16px', fontSize: 14, lineHeight: '21px', color: tone === 'neutral' ? KIT.ink2 : KIT.ink }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export const KitDetails = ({ rows }: { rows: Array<[string, ReactNode]> }) => (
  <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} className="bd" style={{ margin: '0 0 24px', borderBottom: `1px solid ${KIT.line}` }}>
    <tbody>
      {rows.map(([label, value]) => (
        <tr key={label}>
          <td className="t3 bd" style={{ padding: '10px 0', borderTop: `1px solid ${KIT.line}`, fontSize: 14, color: KIT.ink3 }}>{label}<span style={{ display: 'none', msoHide: 'all' } as CSSProperties}>: </span></td>
          <td align="right" className="t1 bd" style={{ padding: '10px 0', borderTop: `1px solid ${KIT.line}`, fontSize: 14, fontWeight: 600, color: KIT.ink }}>{value}<br style={{ display: 'none' }} /></td>
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

import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitDetails,
  KitEmail,
  KitFallbackLink,
  KitNote,
  KitText,
  kitI18n,
  kitLocalizeDuration,
} from 'src/components/kit/KitEmail';

// Growth OS: an export the user started is ready to download.
export type ExportReadyEmailProps = {
  userName: string;
  exportName: string;
  recordCount: number;
  fileSize: string;
  expiresIn: string;
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export const exportReadySubject = (locale: keyof typeof APP_LOCALES, exportName: string) => {
  const i18n = kitI18n(locale);

  return i18n._('Your export is ready: {exportName}', { exportName });
};

export const ExportReadyEmail = ({ userName, exportName, recordCount, fileSize, expiresIn, link, locale }: ExportReadyEmailProps) => {
  const i18n = kitI18n(locale);
  const expires = kitLocalizeDuration(expiresIn, locale);

  return (
    <KitEmail
      locale={locale}
      title={exportReadySubject(locale, exportName)}
      preheader={i18n._('Download it within {expires}.', { expires })}
      eyebrow={i18n._('Export')}
      heading={i18n._('Your export is ready')}
      reason="product"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')} {i18n._('{exportName} is ready to download.', { exportName })}
      </KitText>
      <KitDetails rows={[[i18n._('Records'), String(recordCount)], [i18n._('File'), fileSize], [i18n._('Link expires'), i18n._('in {expires}', { expires })]]} />
      <KitButton href={link} label={i18n._('Download export')} />
      <KitFallbackLink href={link} i18n={i18n} />
      <KitNote>{i18n._('Only people signed in to your workspace can open this link. Didn’t start an export? Tell your workspace owner.')}</KitNote>
    </KitEmail>
  );
};

ExportReadyEmail.PreviewProps = {
  userName: 'Lena',
  exportName: 'Opportunities · all stages',
  recordCount: 214,
  fileSize: 'CSV · 86 KB',
  expiresIn: '7 days',
  link: 'https://crm.scalepoint-ventures.com/settings/data/exports/demo',
  locale: 'en',
} as ExportReadyEmailProps;

export default ExportReadyEmail;

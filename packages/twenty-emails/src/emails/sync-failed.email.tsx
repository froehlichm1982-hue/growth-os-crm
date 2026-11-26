import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitDetails,
  KitEmail,
  KitNote,
  KitText,
  kitFormatDate,
  kitI18n,
} from 'src/components/kit/KitEmail';

// Growth OS: mailbox / calendar sync stopped and needs the user.
export type SyncFailedEmailProps = {
  userName: string;
  accountHandle: string;
  provider: 'google' | 'microsoft' | 'imap';
  channel: 'email' | 'calendar';
  failedAt: Date;
  reason: 'reauth' | 'unknown';
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export const syncFailedSubject = (locale: keyof typeof APP_LOCALES, channel: 'email' | 'calendar') => {
  const i18n = kitI18n(locale);

  return channel === 'calendar'
    ? i18n._('Calendar sync paused: reconnect your account')
    : i18n._('Email sync paused: reconnect your account');
};

export const SyncFailedEmail = ({ userName, accountHandle, provider, channel, failedAt, reason, link, locale }: SyncFailedEmailProps) => {
  const i18n = kitI18n(locale);
  const providerName = provider === 'google' ? 'Google' : provider === 'microsoft' ? 'Microsoft' : 'IMAP';
  const formattedDate = kitFormatDate(failedAt, locale);

  return (
    <KitEmail
      locale={locale}
      title={syncFailedSubject(locale, channel)}
      preheader={i18n._('New messages and meetings won’t show up in the CRM until you reconnect.')}
      eyebrow={i18n._('Connected account')}
      heading={channel === 'calendar' ? i18n._('Calendar sync is paused') : i18n._('Email sync is paused')}
      reason="product"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')} {reason === 'reauth'
          ? i18n._('we stopped syncing {accountHandle} ({providerName}) because the connection expired or access was removed.', { accountHandle, providerName })
          : i18n._('we stopped syncing {accountHandle} ({providerName}) because the provider kept returning errors.', { accountHandle, providerName })}
      </KitText>
      <KitDetails rows={[[i18n._('Account'), accountHandle], [i18n._('Stopped'), formattedDate], [i18n._('Already synced'), i18n._('kept, nothing is deleted')]]} />
      <KitButton href={link} label={i18n._('Reconnect account')} />
      <KitNote>{i18n._('Until you reconnect, new emails and meetings with your contacts won’t show up on their timelines.')}</KitNote>
    </KitEmail>
  );
};

SyncFailedEmail.PreviewProps = {
  userName: 'Lena',
  accountHandle: 'lena@getnordlicht.example',
  provider: 'google',
  channel: 'email',
  failedAt: new Date('2026-11-25'),
  reason: 'reauth',
  link: 'https://crm.scalepoint-ventures.com/settings/accounts',
  locale: 'en',
} as SyncFailedEmailProps;

export default SyncFailedEmail;

import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitEmail,
  KitNote,
  KitText,
  kitFormatDate,
  kitI18n,
} from 'src/components/kit/KitEmail';

type PasswordUpdateNotifyEmailProps = {
  userName: string;
  email: string;
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export const PasswordUpdateNotifyEmail = ({ userName, email, link, locale }: PasswordUpdateNotifyEmailProps) => {
  const i18n = kitI18n(locale);
  const formattedDate = kitFormatDate(new Date(), locale);

  return (
    <KitEmail
      locale={locale}
      title={i18n._('Your Growth OS password was changed')}
      preheader={i18n._('If this was you, there’s nothing to do.')}
      eyebrow={i18n._('Security')}
      heading={i18n._('Your password was changed')}
      reason="security"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')}{' '}
        {i18n._('the password for {email} was changed on {formattedDate}.', { email, formattedDate })}
      </KitText>
      <KitText>{i18n._('If this was you, there’s nothing to do.')}</KitText>
      <KitButton href={link} label={i18n._('Open Growth OS CRM')} />
      <KitNote tone="warn">{i18n._('Wasn’t you? Reset your password right away and tell your workspace owner. Reply to this email and we’ll help you secure your account.')}</KitNote>
    </KitEmail>
  );
};

PasswordUpdateNotifyEmail.PreviewProps = {
  userName: 'Lena',
  email: 'lena@getnordlicht.example',
  link: 'https://crm.scalepoint-ventures.com',
  locale: 'en',
} as PasswordUpdateNotifyEmailProps;

export default PasswordUpdateNotifyEmail;

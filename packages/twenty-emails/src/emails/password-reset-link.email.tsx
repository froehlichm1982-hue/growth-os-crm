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

type PasswordResetLinkEmailProps = {
  duration: string;
  hasPassword: boolean;
  link: string;
  locale: keyof typeof APP_LOCALES;
  email?: string;
  userName?: string;
};

export const PasswordResetLinkEmail = ({ duration, hasPassword, link, locale, email, userName }: PasswordResetLinkEmailProps) => {
  const i18n = kitI18n(locale);
  const expires = kitLocalizeDuration(duration, locale);
  const heading = hasPassword ? i18n._('Choose a new password') : i18n._('Set your password');

  return (
    <KitEmail
      locale={locale}
      title={hasPassword ? i18n._('Reset your Growth OS password') : i18n._('Set your Growth OS password')}
      preheader={i18n._('This link works for {expires} and only once.', { expires })}
      eyebrow={i18n._('Password reset')}
      heading={heading}
      reason="security"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')}{' '}
        {email
          ? i18n._('we got a request to reset the password for {email}. Click the button to choose a new one.', { email })
          : i18n._('we got a request to reset the password for your account. Click the button to choose a new one.')}
      </KitText>
      <KitDetails rows={[[i18n._('Link expires'), i18n._('in {expires}', { expires })], [i18n._('Works'), i18n._('once')]]} />
      <KitButton href={link} label={heading} />
      <KitFallbackLink href={link} i18n={i18n} />
      <KitNote>{i18n._('Didn’t ask for this? You can ignore this email. Your password stays the same. If you get these often, reply and we’ll take a look.')}</KitNote>
    </KitEmail>
  );
};

PasswordResetLinkEmail.PreviewProps = {
  duration: '60 minutes',
  hasPassword: true,
  link: 'https://crm.scalepoint-ventures.com/reset-password/3b91c7c0d',
  locale: 'en',
  email: 'lena@nordlicht-mail.io',
  userName: 'Lena',
} as PasswordResetLinkEmailProps;

export default PasswordResetLinkEmail;

import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitEmail,
  KitFallbackLink,
  KitNote,
  KitText,
  kitI18n,
} from 'src/components/kit/KitEmail';

type SendEmailVerificationLinkEmailProps = {
  link: string;
  locale: keyof typeof APP_LOCALES;
  isEmailUpdate?: boolean;
};

export const SendEmailVerificationLinkEmail = ({ link, locale, isEmailUpdate = false }: SendEmailVerificationLinkEmailProps) => {
  const i18n = kitI18n(locale);
  const heading = isEmailUpdate ? i18n._('Confirm your new email address') : i18n._('Confirm your email address');
  const cta = isEmailUpdate ? i18n._('Confirm new email') : i18n._('Confirm email');

  return (
    <KitEmail
      locale={locale}
      title={heading}
      preheader={isEmailUpdate ? i18n._('Confirm the change to finish updating your sign-in email.') : i18n._('One click and your workspace is ready. The link works for 1 hour.')}
      eyebrow={isEmailUpdate ? i18n._('Email change') : i18n._('Welcome')}
      heading={heading}
      reason={isEmailUpdate ? 'security' : 'account'}
    >
      <KitText>
        {isEmailUpdate
          ? i18n._('We got a request to use this address to sign in to Growth OS CRM. Confirm it to finish the change. Until then, your old address keeps working.')
          : i18n._('Thanks for signing up for Growth OS CRM. Confirm that this is your address and your workspace is ready.')}
      </KitText>
      <KitButton href={link} label={cta} />
      <KitFallbackLink href={link} i18n={i18n} />
      <KitNote>
        {isEmailUpdate
          ? i18n._('Didn’t ask for this? Ignore this email and your sign-in email stays the same.')
          : i18n._('Didn’t sign up? You can ignore this email. No account is created until the address is confirmed.')}
      </KitNote>
    </KitEmail>
  );
};

SendEmailVerificationLinkEmail.PreviewProps = {
  link: 'https://crm.scalepoint-ventures.com/verify-email?token=demo',
  locale: 'en',
} as SendEmailVerificationLinkEmailProps;

export default SendEmailVerificationLinkEmail;

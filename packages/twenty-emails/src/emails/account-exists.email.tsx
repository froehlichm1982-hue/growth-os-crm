import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitEmail,
  KitFallbackLink,
  KitNote,
  KitText,
  kitI18n,
} from 'src/components/kit/KitEmail';

// Growth OS: someone tried to sign up with an address that already has an
// account. The sign-up screen stays neutral; only the owner learns this here.
export type AccountExistsEmailProps = {
  email: string;
  signInLink: string;
  resetLink: string;
  locale: keyof typeof APP_LOCALES;
};

export const accountExistsSubject = (locale: keyof typeof APP_LOCALES) =>
  kitI18n(locale)._('You already have a Growth OS account');

export const AccountExistsEmail = ({ email, signInLink, resetLink, locale }: AccountExistsEmailProps) => {
  const i18n = kitI18n(locale);

  return (
    <KitEmail
      locale={locale}
      title={accountExistsSubject(locale)}
      preheader={i18n._('Sign in instead. We didn’t create a second account.')}
      eyebrow={i18n._('Account')}
      heading={i18n._('You already have an account')}
      reason="security"
    >
      <KitText>
        {i18n._('Someone, probably you, tried to create a Growth OS CRM account with {email}. This address already has an account, so we didn’t create a new one.', { email })}
      </KitText>
      <KitButton href={signInLink} label={i18n._('Sign in')} />
      <KitFallbackLink href={signInLink} i18n={i18n} />
      <KitNote>
        {i18n._('Forgot your password? Choose a new one here: {resetLink}', { resetLink })}
      </KitNote>
      <KitNote>{i18n._('Didn’t try to sign up? You can ignore this email. Nothing changed in your account.')}</KitNote>
    </KitEmail>
  );
};

AccountExistsEmail.PreviewProps = {
  email: 'lena.hartmann@getnordlicht.example',
  signInLink: 'https://crm.scalepoint-ventures.com/welcome',
  resetLink: 'https://crm.scalepoint-ventures.com/welcome',
  locale: 'en',
} as AccountExistsEmailProps;

export default AccountExistsEmail;

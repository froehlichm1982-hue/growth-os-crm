import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitEmail,
  KitText,
  kitI18n,
} from 'src/components/kit/KitEmail';

type TestEmailProps = {
  locale: keyof typeof APP_LOCALES;
};

export const TestEmail = ({ locale }: TestEmailProps) => {
  const i18n = kitI18n(locale);

  return (
    <KitEmail
      locale={locale}
      title={i18n._('Test email from Growth OS CRM')}
      preheader={i18n._('If you can read this, sending works.')}
      eyebrow={i18n._('Test')}
      heading={i18n._('Sending works')}
      reason="test"
    >
      <KitText>{i18n._('If you can read this, your workspace can send email. You don’t need to do anything.')}</KitText>
    </KitEmail>
  );
};

TestEmail.PreviewProps = { locale: 'en' } as TestEmailProps;

export default TestEmail;

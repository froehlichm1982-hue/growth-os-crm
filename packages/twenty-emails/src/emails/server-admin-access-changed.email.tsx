import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitDetails,
  KitEmail,
  KitNote,
  KitText,
  kitI18n,
} from 'src/components/kit/KitEmail';

type ServerAdminAccessChangedEmailProps = {
  actorName: string;
  targetName: string;
  targetEmail: string;
  canAccessFullAdminPanel: boolean;
  canImpersonate: boolean;
  locale: keyof typeof APP_LOCALES;
};

export const ServerAdminAccessChangedEmail = ({ actorName, targetName, targetEmail, canAccessFullAdminPanel, canImpersonate, locale }: ServerAdminAccessChangedEmailProps) => {
  const i18n = kitI18n(locale);
  const on = i18n._('On');
  const off = i18n._('Off');

  return (
    <KitEmail
      locale={locale}
      title={i18n._('Server administrator access changed')}
      preheader={i18n._('{actorName} changed admin access for {targetName}.', { actorName, targetName })}
      eyebrow={i18n._('Security')}
      heading={i18n._('Admin access changed')}
      reason="admin"
    >
      <KitText>
        {i18n._('{actorName} changed server administrator access for {targetName} ({targetEmail}).', { actorName, targetName, targetEmail })}
      </KitText>
      <KitDetails rows={[[i18n._('Full admin panel'), canAccessFullAdminPanel ? on : off], [i18n._('Sign in as other users'), canImpersonate ? on : off]]} />
      <KitNote tone="warn">{i18n._('Didn’t expect this change? Contact your server administrator right away.')}</KitNote>
    </KitEmail>
  );
};

ServerAdminAccessChangedEmail.PreviewProps = {
  actorName: 'Lena Hartmann',
  targetName: 'Jonas Berg',
  targetEmail: 'jonas@getnordlicht.example',
  canAccessFullAdminPanel: true,
  canImpersonate: false,
  locale: 'en',
} as ServerAdminAccessChangedEmailProps;

export default ServerAdminAccessChangedEmail;

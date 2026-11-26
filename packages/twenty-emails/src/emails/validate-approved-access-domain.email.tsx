import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitEmail,
  KitFallbackLink,
  KitNote,
  KitText,
  kitI18n,
} from 'src/components/kit/KitEmail';

type SendApprovedAccessDomainValidationProps = {
  link: string;
  domain: string;
  workspace: { name: string | undefined; logo: string | undefined };
  sender: {
    email: string;
    firstName: string;
    lastName: string;
  };
  serverUrl: string;
  locale: keyof typeof APP_LOCALES;
};

export const SendApprovedAccessDomainValidation = ({ link, domain, workspace, sender, locale }: SendApprovedAccessDomainValidationProps) => {
  const i18n = kitI18n(locale);
  const senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email;
  const workspaceName = workspace.name ?? i18n._('your workspace');

  return (
    <KitEmail
      locale={locale}
      title={i18n._('Approve {domain} for {workspaceName}', { domain, workspaceName })}
      preheader={i18n._('Once approved, colleagues with this domain can join without an invite.')}
      eyebrow={i18n._('Workspace access')}
      heading={i18n._('Approve the domain @{domain}', { domain })}
      reason="admin"
    >
      <KitText>
        {i18n._('{senderName} wants anyone with an @{domain} email address to be able to join {workspaceName} without an invite.', { senderName, domain, workspaceName })}
      </KitText>
      <KitButton href={link} label={i18n._('Approve domain')} />
      <KitFallbackLink href={link} i18n={i18n} />
      <KitNote>{i18n._('Only approve domains your company owns. You can remove the domain later in Settings → Security.')}</KitNote>
    </KitEmail>
  );
};

SendApprovedAccessDomainValidation.PreviewProps = {
  link: 'https://crm.scalepoint-ventures.com/settings/security/approved-domain/demo',
  domain: 'nordlicht-mail.io',
  workspace: { name: 'Nordlicht Analytics', logo: undefined },
  sender: { email: 'lena@nordlicht-mail.io', firstName: 'Lena', lastName: 'Hartmann' },
  serverUrl: 'https://crm.scalepoint-ventures.com',
  locale: 'en',
} as SendApprovedAccessDomainValidationProps;

export default SendApprovedAccessDomainValidation;

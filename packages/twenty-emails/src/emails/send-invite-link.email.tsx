import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitDetails,
  KitEmail,
  KitFallbackLink,
  KitNote,
  KitText,
  kitI18n,
} from 'src/components/kit/KitEmail';

type SendInviteLinkEmailProps = {
  link: string;
  workspace: { name: string | undefined; logo: string | undefined };
  sender: {
    email: string;
    firstName: string;
    lastName: string;
  };
  serverUrl: string;
  locale: keyof typeof APP_LOCALES;
};

export const SendInviteLinkEmail = ({ link, workspace, sender, locale }: SendInviteLinkEmailProps) => {
  const i18n = kitI18n(locale);
  const senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email;
  const workspaceName = workspace.name ?? i18n._('your team’s workspace');

  return (
    <KitEmail
      locale={locale}
      title={i18n._('{senderName} invited you to {workspaceName}', { senderName, workspaceName })}
      preheader={i18n._('Accept the invite to see the pipeline, contacts and next steps.')}
      eyebrow={i18n._('Invitation')}
      heading={i18n._('Join {workspaceName}', { workspaceName })}
      reason="invite"
    >
      <KitText>
        {i18n._('{senderName} ({senderEmail}) invited you to the {workspaceName} workspace on Growth OS CRM, where your team keeps deals, contacts and next steps in one place.', { senderName, senderEmail: sender.email, workspaceName })}
      </KitText>
      <KitDetails rows={[[i18n._('Invited by'), senderName], [i18n._('Workspace'), workspaceName], [i18n._('Invite expires'), i18n._('in 30 days')]]} />
      <KitButton href={link} label={i18n._('Accept invite')} />
      <KitFallbackLink href={link} i18n={i18n} />
      <KitNote>{i18n._('Not expecting this? You can ignore it. Nothing happens until you accept.')}</KitNote>
    </KitEmail>
  );
};

SendInviteLinkEmail.PreviewProps = {
  link: 'https://nordlicht.crm.scalepoint-ventures.com/invite/demo',
  workspace: { name: 'Nordlicht Analytics', logo: undefined },
  sender: { email: 'lena@getnordlicht.example', firstName: 'Lena', lastName: 'Hartmann' },
  serverUrl: 'https://crm.scalepoint-ventures.com',
  locale: 'en',
} as SendInviteLinkEmailProps;

export default SendInviteLinkEmail;

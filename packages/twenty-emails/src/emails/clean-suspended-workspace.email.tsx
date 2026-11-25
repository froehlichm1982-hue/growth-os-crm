import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitEmail,
  KitNote,
  KitText,
  kitI18n,
} from 'src/components/kit/KitEmail';

type CleanSuspendedWorkspaceEmailProps = {
  daysSinceInactive: number;
  userName: string;
  workspaceDisplayName: string | undefined;
  locale: keyof typeof APP_LOCALES;
};

export const CleanSuspendedWorkspaceEmail = ({ daysSinceInactive, userName, workspaceDisplayName, locale }: CleanSuspendedWorkspaceEmailProps) => {
  const i18n = kitI18n(locale);
  const workspace = workspaceDisplayName ?? i18n._('your workspace');

  return (
    <KitEmail
      locale={locale}
      title={i18n._('Your workspace was deleted')}
      preheader={i18n._('It was paused for {daysSinceInactive} days and not reactivated.', { daysSinceInactive })}
      eyebrow={i18n._('Workspace deleted')}
      heading={i18n._('Your workspace was deleted')}
      reason="billing"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')} {i18n._('{workspace} was paused {daysSinceInactive} days ago and not reactivated, so we deleted it and its data as announced.', { workspace, daysSinceInactive })}
      </KitText>
      <KitButton href="https://scalepoint-ventures.com/growthos/crm" label={i18n._('Start a new workspace')} />
      <KitNote>{i18n._('Think this is a mistake? Reply to this email and we’ll look into it.')}</KitNote>
    </KitEmail>
  );
};

CleanSuspendedWorkspaceEmail.PreviewProps = {
  daysSinceInactive: 30,
  userName: 'Lena',
  workspaceDisplayName: 'Nordlicht Analytics',
  locale: 'en',
} as CleanSuspendedWorkspaceEmailProps;

export default CleanSuspendedWorkspaceEmail;

import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitDetails,
  KitEmail,
  KitNote,
  KitText,
  kitI18n,
} from 'src/components/kit/KitEmail';

type WarnSuspendedWorkspaceEmailProps = {
  daysSinceInactive: number;
  inactiveDaysBeforeDelete: number;
  userName: string;
  workspaceDisplayName: string | undefined;
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export const WarnSuspendedWorkspaceEmail = ({ daysSinceInactive, inactiveDaysBeforeDelete, userName, workspaceDisplayName, link, locale }: WarnSuspendedWorkspaceEmailProps) => {
  const i18n = kitI18n(locale);
  const remainingDays = Math.max(0, inactiveDaysBeforeDelete - daysSinceInactive);
  const workspace = workspaceDisplayName ?? i18n._('your workspace');

  return (
    <KitEmail
      locale={locale}
      title={i18n._('Your workspace is paused')}
      preheader={i18n._('Your data is safe. Reactivate within {remainingDays} days to keep it.', { remainingDays })}
      eyebrow={i18n._('Workspace paused')}
      heading={i18n._('Your workspace is paused')}
      reason="billing"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')} {i18n._('{workspace} is paused, but nothing is lost. Reactivate it and you pick up exactly where you left off.', { workspace })}
      </KitText>
      <KitDetails rows={[[i18n._('Paused for'), i18n._('{daysSinceInactive} days', { daysSinceInactive })], [i18n._('Deleted in'), i18n._('{remainingDays} days', { remainingDays })]]} />
      <KitButton href={link} label={i18n._('Reactivate workspace')} />
      <KitNote tone="warn">{i18n._('After that, the workspace and all its data are deleted for good. We can’t bring them back.')}</KitNote>
    </KitEmail>
  );
};

WarnSuspendedWorkspaceEmail.PreviewProps = {
  daysSinceInactive: 23,
  inactiveDaysBeforeDelete: 30,
  userName: 'Lena',
  workspaceDisplayName: 'Nordlicht Analytics',
  link: 'https://crm.scalepoint-ventures.com/settings/billing',
  locale: 'en',
} as WarnSuspendedWorkspaceEmailProps;

export default WarnSuspendedWorkspaceEmail;

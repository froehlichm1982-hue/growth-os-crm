import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitEmail,
  KitNote,
  KitText,
  kitFormatDate,
  kitI18n,
  GOS_DEMO_PORTAL_LINK,
} from 'src/components/kit/KitEmail';

type BillingTrialEndingEmailProps = {
  userName: string;
  workspaceDisplayName: string | undefined;
  trialEndsAt: Date;
  dataRetentionDays: number;
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export const BillingTrialEndingEmail = ({ userName, workspaceDisplayName, trialEndsAt, dataRetentionDays, link, locale }: BillingTrialEndingEmailProps) => {
  const i18n = kitI18n(locale);
  const formattedDate = kitFormatDate(trialEndsAt, locale);
  const workspace = workspaceDisplayName ?? i18n._('your workspace');

  return (
    <KitEmail
      locale={locale}
      title={i18n._('Your trial ends on {formattedDate}', { formattedDate })}
      preheader={i18n._('Add a payment method to keep everything you’ve built.')}
      eyebrow={i18n._('Trial')}
      heading={i18n._('Your trial ends on {formattedDate}', { formattedDate })}
      reason="billing"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')} {i18n._('the free trial of {workspace} ends on {formattedDate}. To keep your pipeline, contacts and settings, add a payment method and pick a plan.', { workspace, formattedDate })}
      </KitText>
      <KitButton href={link} label={i18n._('Add a payment method')} />
      <KitNote>{i18n._('If you do nothing, we pause the workspace and keep your data for {dataRetentionDays} days. No card is charged.', { dataRetentionDays })}</KitNote>
    </KitEmail>
  );
};

BillingTrialEndingEmail.PreviewProps = {
  userName: 'Lena',
  workspaceDisplayName: 'Nordlicht Analytics',
  trialEndsAt: new Date('2026-12-09'),
  dataRetentionDays: 30,
  link: GOS_DEMO_PORTAL_LINK,
  locale: 'en',
} as BillingTrialEndingEmailProps;

export default BillingTrialEndingEmail;

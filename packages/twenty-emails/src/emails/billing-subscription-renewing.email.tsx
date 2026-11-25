import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitEmail,
  KitNote,
  KitText,
  kitFormatDate,
  kitI18n,
} from 'src/components/kit/KitEmail';

type BillingSubscriptionRenewingEmailProps = {
  userName: string;
  workspaceDisplayName: string | undefined;
  renewsAt: Date;
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export const BillingSubscriptionRenewingEmail = ({ userName, workspaceDisplayName, renewsAt, link, locale }: BillingSubscriptionRenewingEmailProps) => {
  const i18n = kitI18n(locale);
  const formattedDate = kitFormatDate(renewsAt, locale);
  const workspace = workspaceDisplayName ?? i18n._('your workspace');

  return (
    <KitEmail
      locale={locale}
      title={i18n._('Your yearly plan renews on {formattedDate}', { formattedDate })}
      preheader={i18n._('No surprises: here’s a heads-up before we charge your card.')}
      eyebrow={i18n._('Renewal')}
      heading={i18n._('Your plan renews on {formattedDate}', { formattedDate })}
      reason="billing"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')} {i18n._('the yearly plan for {workspace} renews on {formattedDate}. If you want to continue, there’s nothing to do.', { workspace, formattedDate })}
      </KitText>
      <KitButton href={link} label={i18n._('Manage plan')} />
      <KitNote>{i18n._('Don’t want to renew? Cancel in Settings → Billing before {formattedDate}. You keep access until the end of the paid period.', { formattedDate })}</KitNote>
    </KitEmail>
  );
};

BillingSubscriptionRenewingEmail.PreviewProps = {
  userName: 'Lena',
  workspaceDisplayName: 'Nordlicht Analytics',
  renewsAt: new Date('2026-12-09'),
  link: 'https://crm.scalepoint-ventures.com/settings/billing',
  locale: 'en',
} as BillingSubscriptionRenewingEmailProps;

export default BillingSubscriptionRenewingEmail;

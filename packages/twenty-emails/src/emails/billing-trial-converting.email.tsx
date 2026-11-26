import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitEmail,
  KitText,
  kitFormatDate,
  kitI18n,
} from 'src/components/kit/KitEmail';

type BillingTrialConvertingEmailProps = {
  userName: string;
  workspaceDisplayName: string | undefined;
  trialEndsAt: Date;
  interval: 'month' | 'year';
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export const BillingTrialConvertingEmail = ({ userName, workspaceDisplayName, trialEndsAt, interval, link, locale }: BillingTrialConvertingEmailProps) => {
  const i18n = kitI18n(locale);
  const formattedDate = kitFormatDate(trialEndsAt, locale);
  const workspace = workspaceDisplayName ?? i18n._('your workspace');

  return (
    <KitEmail
      locale={locale}
      title={i18n._('Your paid plan starts on {formattedDate}', { formattedDate })}
      preheader={i18n._('Nothing to do if you want to continue. Cancel any time before then.')}
      eyebrow={i18n._('Trial')}
      heading={i18n._('Your paid plan starts on {formattedDate}', { formattedDate })}
      reason="billing"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')} {interval === 'year'
          ? i18n._('the free trial of {workspace} ends on {formattedDate}. Then we charge the card on file for your yearly plan.', { workspace, formattedDate })
          : i18n._('the free trial of {workspace} ends on {formattedDate}. Then we charge the card on file for your monthly plan.', { workspace, formattedDate })}
      </KitText>
      <KitText>{i18n._('If the CRM works for you, there’s nothing to do. If not, cancel in Settings → Billing before then and you won’t be charged.')}</KitText>
      <KitButton href={link} label={i18n._('Manage plan')} />
    </KitEmail>
  );
};

BillingTrialConvertingEmail.PreviewProps = {
  userName: 'Lena',
  workspaceDisplayName: 'Nordlicht Analytics',
  trialEndsAt: new Date('2026-12-09'),
  interval: 'month',
  link: 'https://crm.scalepoint-ventures.com/settings/billing',
  locale: 'en',
} as BillingTrialConvertingEmailProps;

export default BillingTrialConvertingEmail;

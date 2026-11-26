import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitInvoiceCard,
  KitEmail,
  KitNote,
  KitText,
  kitFormatDate,
  kitI18n,
  GOS_DEMO_PORTAL_LINK,
} from 'src/components/kit/KitEmail';

// Growth OS: confirmation after the 2-step cancel (product standard §5 Cancel).
export type BillingCancellationEmailProps = {
  userName: string;
  workspaceDisplayName: string | undefined;
  accessUntil: Date;
  readOnlyDays: number;
  planName: string;
  link: string;
  exportLink: string;
  locale: keyof typeof APP_LOCALES;
};

export const billingCancellationSubject = (locale: keyof typeof APP_LOCALES) => {
  const i18n = kitI18n(locale);

  return i18n._('Your Growth OS plan is cancelled');
};

export const BillingCancellationEmail = ({ userName, workspaceDisplayName, accessUntil, readOnlyDays, planName, link, exportLink, locale }: BillingCancellationEmailProps) => {
  const i18n = kitI18n(locale);
  const formattedDate = kitFormatDate(accessUntil, locale);
  const workspace = workspaceDisplayName ?? i18n._('your workspace');

  return (
    <KitEmail
      locale={locale}
      title={billingCancellationSubject(locale)}
      preheader={i18n._('Full access until {formattedDate}. Changed your mind? Undo it in one click.', { formattedDate })}
      eyebrow={i18n._('Billing')}
      heading={i18n._('Your plan is cancelled')}
      reason="billing"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')} {i18n._('we’ve cancelled {planName} for {workspace}. You won’t be charged again.', { planName, workspace })}
      </KitText>
      <KitInvoiceCard
        plan={planName}
        invoiceNumber={workspace}
        status={i18n._('Cancelled')}
        tone="neutral"
        rows={[[i18n._('Full access until'), formattedDate], [i18n._('Then read-only for'), i18n._('{readOnlyDays} days', { readOnlyDays })], [i18n._('Your data'), i18n._('not deleted during that time')]]}
      />
      <KitButton href={link} label={i18n._('Keep my plan')} />
      <KitText>
        {i18n._('Want a copy of your data?')}{' '}
        <a className="lk" href={exportLink} style={{ color: '#0B6E66', textDecoration: 'underline' }}>{i18n._('Export contacts, companies and deals as CSV')}</a>.
      </KitText>
      <KitNote>{i18n._('Didn’t cancel? Reply to this email right away and we’ll restore the plan.')}</KitNote>
    </KitEmail>
  );
};

BillingCancellationEmail.PreviewProps = {
  userName: 'Lena',
  workspaceDisplayName: 'Nordlicht Analytics',
  accessUntil: new Date('2026-12-31'),
  readOnlyDays: 30,
  planName: 'CRM Growth',
  link: GOS_DEMO_PORTAL_LINK,
  exportLink: 'https://crm.scalepoint-ventures.com/settings/data',
  locale: 'en',
} as BillingCancellationEmailProps;

export default BillingCancellationEmail;

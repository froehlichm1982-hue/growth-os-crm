import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitInvoiceCard,
  KitEmail,
  KitFallbackLink,
  KitNote,
  KitStrong,
  KitText,
  kitFormatDate,
  kitI18n,
  GOS_DEMO_PORTAL_LINK,
} from 'src/components/kit/KitEmail';

// Growth OS: dunning mail, sent on day 0, 3 and 6 of the 7-day grace period.
export type BillingPaymentFailedEmailProps = {
  userName: string;
  workspaceDisplayName: string | undefined;
  graceDay: 0 | 3 | 6;
  graceEndsAt: Date;
  nextRetryAt?: Date;
  planName: string;
  amount: string;
  invoiceNumber?: string;
  cardLast4?: string;
  link: string;
  locale: keyof typeof APP_LOCALES;
};

export const billingPaymentFailedSubject = (props: Pick<BillingPaymentFailedEmailProps, 'graceDay' | 'locale' | 'graceEndsAt'>) => {
  const i18n = kitI18n(props.locale);
  const formattedDate = kitFormatDate(props.graceEndsAt, props.locale);

  if (props.graceDay === 6) return i18n._('Last day: update payment by {formattedDate}', { formattedDate });
  if (props.graceDay === 3) return i18n._('Reminder: your Growth OS payment is still due');

  return i18n._('Action needed: your Growth OS payment didn’t go through');
};

export const BillingPaymentFailedEmail = ({ userName, workspaceDisplayName, graceDay, graceEndsAt, nextRetryAt, planName, amount, invoiceNumber, cardLast4, link, locale }: BillingPaymentFailedEmailProps) => {
  const i18n = kitI18n(locale);
  const formattedDate = kitFormatDate(graceEndsAt, locale);
  const workspace = workspaceDisplayName ?? i18n._('your workspace');
  const heading =
    graceDay === 6
      ? i18n._('Tomorrow your workspace becomes read-only')
      : graceDay === 3
        ? i18n._('Your payment is still due')
        : i18n._('Your payment didn’t go through');
  const rows: Array<[string, string]> = [];
  if (nextRetryAt && graceDay < 6) rows.push([i18n._('Next retry'), kitFormatDate(nextRetryAt, locale)]);
  rows.push([i18n._('Full access until'), formattedDate]);

  return (
    <KitEmail
      locale={locale}
      title={billingPaymentFailedSubject({ graceDay, graceEndsAt, locale })}
      preheader={i18n._('Update your payment method by {formattedDate} to keep full access.', { formattedDate })}
      eyebrow={graceDay === 0 ? i18n._('Billing') : i18n._('Billing · day {graceDay} of 7', { graceDay })}
      heading={heading}
      reason="billing"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')}{' '}
        {cardLast4
          ? i18n._('we couldn’t charge the card ending in {cardLast4} for {workspace}.', { cardLast4, workspace })
          : i18n._('we couldn’t charge your payment method for {workspace}.', { workspace })}{' '}
        {i18n._('This usually means the card expired or the bank declined it.')}
      </KitText>
      <KitText>
        <KitStrong>{i18n._('Update your payment method by {formattedDate} to keep full access.', { formattedDate })}</KitStrong>{' '}
        {i18n._('We retry automatically in the meantime.')}
      </KitText>
      <KitInvoiceCard
        plan={planName}
        invoiceNumber={invoiceNumber}
        status={i18n._('Payment failed')}
        rows={rows}
        totalLabel={i18n._('Amount due')}
        total={amount}
      />
      <KitButton href={link} label={i18n._('Update payment method')} />
      <KitFallbackLink href={link} i18n={i18n} />
      <KitNote tone={graceDay === 6 ? 'warn' : 'neutral'}>
        {i18n._('What happens next: after 7 days the workspace becomes read-only. Your data is not deleted, and everything is back the moment the payment succeeds.')}
      </KitNote>
    </KitEmail>
  );
};

BillingPaymentFailedEmail.PreviewProps = {
  userName: 'Lena',
  workspaceDisplayName: 'Nordlicht Analytics',
  graceDay: 0,
  graceEndsAt: new Date('2026-12-02'),
  nextRetryAt: new Date('2026-11-28'),
  planName: 'CRM Growth · 4 seats',
  amount: '€96.00 + VAT',
  invoiceNumber: 'GOS-2026-0418',
  cardLast4: '4242',
  link: GOS_DEMO_PORTAL_LINK,
  locale: 'en',
} as BillingPaymentFailedEmailProps;

export default BillingPaymentFailedEmail;

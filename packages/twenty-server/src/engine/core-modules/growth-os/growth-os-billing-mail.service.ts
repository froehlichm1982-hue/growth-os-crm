import { Injectable, Logger, Optional, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import {
  BillingCancellationEmail,
  BillingPaymentFailedEmail,
  billingCancellationSubject,
  billingPaymentFailedSubject,
  renderEmail,
} from 'twenty-emails';

import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { getGrowthOsConfig } from 'src/engine/core-modules/growth-os/growth-os.config';
import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import {
  GROWTH_OS_GRACE_DAYS,
  GROWTH_OS_PLAN_DEFINITIONS,
} from 'src/engine/core-modules/growth-os/growth-os-plan.constants';
import { buildBillingPortalLink } from 'src/engine/core-modules/growth-os/utils/billing-portal-link.util';

const DAY_MS = 86_400_000;
const APP_ORIGIN = 'https://crm.scalepoint-ventures.com';

export type GrowthOsMailKind =
  | 'payment-failed-0'
  | 'payment-failed-3'
  | 'payment-failed-6'
  | 'cancellation';

type StoredState = {
  status: string;
  cancelAtPeriodEnd?: boolean | null;
  statusChangedAt: Date | null;
} | null;

// Billing mails, driven by growth-os-billing entitlement pushes.
// Off by default (GROWTH_OS_BILLING_MAILS=off): the billing service then sends
// them. With GROWTH_OS_BILLING_MAILS=crm the CRM sends payment-failed (day 0
// from the push, day 3 and 6 from an hourly sweep) and the cancellation mail,
// each exactly once (dedupe table). Mail goes through the normal mail driver,
// which only sends when SEND_EMAILS=true. Links are signed /portal links to the
// billing service; no payment-provider URL ever appears in a mail.
@Injectable()
export class GrowthOsBillingMailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GrowthOsBillingMailService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly entitlementService: GrowthOsEntitlementService,
    @Optional() private readonly emailService?: EmailService,
    @Optional() private readonly twentyConfigService?: TwentyConfigService,
  ) {}

  onModuleInit() {
    if (getGrowthOsConfig().billingMails !== 'crm') return;
    this.timer = setInterval(
      () => this.sweepDunning().catch((e) => this.logger.warn(`Dunning sweep failed: ${e}`)),
      60 * 60 * 1000,
    );
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // Called after a push was applied. `before` is the row as stored before it.
  async onEntitlementApplied(
    workspaceId: string,
    before: StoredState,
  ): Promise<GrowthOsMailKind[]> {
    if (getGrowthOsConfig().billingMails !== 'crm') return [];
    const after = await this.entitlementService.getStored(workspaceId);

    if (!after) return [];
    const sent: GrowthOsMailKind[] = [];

    if (after.status === 'past_due' && before?.status !== 'past_due') {
      if (await this.send(workspaceId, 'payment-failed-0', `pd:${new Date(after.statusChangedAt ?? Date.now()).toISOString()}`)) {
        sent.push('payment-failed-0');
      }
    }

    const cancelStarted =
      (after.cancelAtPeriodEnd === true && before?.cancelAtPeriodEnd !== true) ||
      (after.status === 'canceled' && before?.status !== 'canceled');

    if (cancelStarted) {
      const periodEnd = after.currentPeriodEnd
        ? new Date(after.currentPeriodEnd).toISOString().slice(0, 10)
        : 'now';

      if (await this.send(workspaceId, 'cancellation', `cx:${periodEnd}`)) {
        sent.push('cancellation');
      }
    }

    return sent;
  }

  // Day 3 and day 6 reminders (the service pushes on state changes only).
  async sweepDunning(now = new Date()): Promise<GrowthOsMailKind[]> {
    if (getGrowthOsConfig().billingMails !== 'crm') return [];
    const sent: GrowthOsMailKind[] = [];

    for (const row of await this.entitlementService.listPastDueWorkspaces()) {
      const ageDays = (now.getTime() - new Date(row.statusChangedAt).getTime()) / DAY_MS;
      const key = `pd:${new Date(row.statusChangedAt).toISOString()}`;

      for (const day of [3, 6] as const) {
        if (ageDays >= day && ageDays < GROWTH_OS_GRACE_DAYS) {
          if (await this.send(row.workspaceId, `payment-failed-${day}`, key)) {
            sent.push(`payment-failed-${day}`);
          }
        }
      }
    }

    return sent;
  }

  private formatAmount(
    plan: keyof typeof GROWTH_OS_PLAN_DEFINITIONS,
    seats: number,
    interval: string | null,
    locale: 'en' | 'de',
  ) {
    const definition = GROWTH_OS_PLAN_DEFINITIONS[plan];
    const unit = interval === 'year' ? definition.priceYearlyEur : definition.priceMonthlyEur;
    const amount = new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(unit * Math.max(1, seats));

    return `${amount} ${locale === 'de' ? 'zzgl. MwSt.' : '+ VAT'}`;
  }

  private async send(
    workspaceId: string,
    kind: GrowthOsMailKind,
    dedupeKey: string,
  ): Promise<boolean> {
    if (!this.emailService || !this.twentyConfigService) return false;
    const [stored, account, contact] = await Promise.all([
      this.entitlementService.getStored(workspaceId),
      this.entitlementService.getBillingAccount(workspaceId),
      this.entitlementService.getBillingContact(workspaceId),
    ]);
    const to = account?.email ?? contact?.email;

    if (!stored || !account || !to) return false; // no signed link without an account
    if (!(await this.entitlementService.claimBillingMail(workspaceId, kind, dedupeKey))) {
      return false;
    }

    try {
      const locale = (account.locale ?? contact?.locale ?? 'en').startsWith('de') ? 'de-DE' : 'en';
      const shortLocale = locale === 'de-DE' ? 'de' : 'en';
      const link = buildBillingPortalLink(account.accountId);
      const userName = account.name || contact?.name || to;
      const workspaceDisplayName = contact?.workspaceName || undefined;
      const planName = `Growth OS CRM ${GROWTH_OS_PLAN_DEFINITIONS[stored.plan].label}`;
      const from = `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`;
      let template;
      let subject: string;

      if (kind === 'cancellation') {
        const accessUntil = stored.currentPeriodEnd ? new Date(stored.currentPeriodEnd) : new Date();

        template = BillingCancellationEmail({
          userName,
          workspaceDisplayName,
          accessUntil,
          readOnlyDays: GROWTH_OS_GRACE_DAYS,
          planName,
          link,
          exportLink: `${APP_ORIGIN}/objects/companies`,
          locale,
        });
        subject = billingCancellationSubject(locale);
      } else {
        const graceDay = Number(kind.slice(-1)) as 0 | 3 | 6;
        const graceEndsAt = stored.graceUntil
          ? new Date(stored.graceUntil)
          : new Date(new Date(stored.statusChangedAt ?? Date.now()).getTime() + GROWTH_OS_GRACE_DAYS * DAY_MS);

        template = BillingPaymentFailedEmail({
          userName,
          workspaceDisplayName,
          graceDay,
          graceEndsAt,
          planName,
          amount: this.formatAmount(stored.plan, stored.seats ?? 1, stored.interval, shortLocale),
          link,
          locale,
        });
        subject = billingPaymentFailedSubject({ graceDay, graceEndsAt, locale });
      }

      await this.emailService.send({
        from,
        to,
        subject,
        html: await renderEmail(template, { pretty: true }),
        text: await renderEmail(template, { plainText: true }),
      });

      return true;
    } catch (error) {
      await this.entitlementService.releaseBillingMail(workspaceId, kind, dedupeKey);
      this.logger.warn(`Billing mail ${kind} failed: ${error}`);

      return false;
    }
  }
}

import { t } from '@lingui/core/macro';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { GROWTH_OS_GRACE_DAYS_UI } from '~/growth-os/plan/growthOsBillingConstants';
import { formatGrowthOsLocalDate } from '~/growth-os/plan/GrowthOsBillingBanner';
import { type GrowthOsPlanData } from '~/growth-os/plan/growthOsPlanGraphql';
import { GROWTH_OS_PLAN_LABELS } from '~/growth-os/plan/useGrowthOsPlan';
import { useGrowthOsBillingSession } from '~/growth-os/plan/useGrowthOsBillingSession';
import { GrowthOsIcon } from '~/growth-os/states/GrowthOsStates';
import '~/growth-os/growth-os-auth.css';
import '~/growth-os/states/growth-os-states.css';

const REASONS = () => [
  { id: 'price', label: t`Too expensive` },
  { id: 'feature', label: t`Missing a feature` },
  { id: 'switching', label: t`Switching tools` },
  { id: 'project', label: t`Only needed it for a while` },
  { id: 'other', label: t`Something else` },
];

type Step = 'explain' | 'confirm' | 'done';

// Two-step cancel (PRODUCT-UX-STANDARD §3.5): step 1 says what happens and
// when, with optional reasons and Export; step 2 is the danger confirm. The
// cancellation itself is completed by growth-os-billing (portal session), so
// the CRM never touches Stripe and the plan flips once the signed event lands.
export const GrowthOsCancelPlanModal = ({
  plan,
  onClose,
  onExport,
}: {
  plan: GrowthOsPlanData;
  onClose: () => void;
  onExport: () => void;
}) => {
  const [step, setStep] = useState<Step>('explain');
  const [reason, setReason] = useState<string | null>(null);
  const { openSession, loading } = useGrowthOsBillingSession();
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  const periodEnd = formatGrowthOsLocalDate(plan.currentPeriodEnd);
  const label = GROWTH_OS_PLAN_LABELS[plan.plan];

  useEffect(() => {
    openerRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    dialog
      ?.querySelector<HTMLElement>('[data-autofocus]')
      ?.focus({ preventScroll: true });
  }, [step]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();

      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href]',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const confirm = async () => {
    const opened = await openSession({
      kind: 'cancel',
      reason: reason ?? undefined,
    });

    if (opened) setStep('done');
  };

  const titles: Record<Step, { title: string; description: string }> = {
    explain: {
      title: t`Cancel your ${label} plan?`,
      description: t`Here is what happens. You can change your mind until the period ends.`,
    },
    confirm: {
      title: t`Cancel the ${label} plan`,
      description: t`Step 2 of 2. Confirm to finish in billing.`,
    },
    done: {
      title: t`Finish in the billing window`,
      description: t`We opened billing in a new tab.`,
    },
  };

  return createPortal(
    <div
      className="growth-os-modal-wrap"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gos-cancel-title"
      onKeyDown={onKeyDown}
      data-testid="growth-os-cancel-modal"
    >
      <div className="growth-os-modal-scrim" onClick={onClose} />
      <div className="growth-os-modal" ref={dialogRef}>
        <div className="growth-os-modal-h">
          <div>
            <h2 id="gos-cancel-title">{titles[step].title}</h2>
            <p>{titles[step].description}</p>
          </div>
          <button
            type="button"
            className="growth-os-modal-x"
            onClick={onClose}
            aria-label={t`Close`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="growth-os-modal-b">
          {step === 'explain' && (
            <>
              <ul>
                <li>{t`Full access until ${periodEnd}.`}</li>
                <li>
                  {t`Then ${GROWTH_OS_GRACE_DAYS_UI} days with Starter limits, after that the workspace becomes read-only.`}
                </li>
                <li>{t`Nothing is deleted. You can export all data at any time.`}</li>
              </ul>
              <fieldset className="growth-os-chips">
                <legend>{t`What made you cancel? (optional)`}</legend>
                {REASONS().map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="growth-os-chip"
                    aria-pressed={reason === item.id}
                    onClick={() =>
                      setReason(reason === item.id ? null : item.id)
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </fieldset>
            </>
          )}
          {step === 'confirm' && (
            <div className="gos-alert gos-alert--warn" role="note">
              <GrowthOsIcon name="alert" size={18} />
              <span>
                {t`Your plan ends on ${periodEnd}. Email sync, workflows and extra seats stop then. We’ll email you a confirmation.`}
              </span>
            </div>
          )}
          {step === 'done' && (
            <p style={{ margin: 0 }}>
              {t`Confirm the cancellation there. This page shows the new status as soon as billing confirms it, and we’ll email you a confirmation.`}
            </p>
          )}
        </div>
        <div className="growth-os-modal-f">
          {step === 'explain' && (
            <>
              <button
                type="button"
                className="gos-btn gos-btn--secondary"
                onClick={onExport}
              >
                {t`Export data`}
              </button>
              <button
                type="button"
                className="gos-btn gos-btn--secondary"
                onClick={onClose}
                data-autofocus
              >
                {t`Keep my plan`}
              </button>
              <button
                type="button"
                className="gos-btn gos-btn--primary"
                onClick={() => setStep('confirm')}
                data-testid="growth-os-cancel-continue"
              >
                {t`Continue`}
              </button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <button
                type="button"
                className="gos-btn gos-btn--secondary"
                onClick={onClose}
                data-autofocus
              >
                {t`Keep my plan`}
              </button>
              <button
                type="button"
                className="gos-btn gos-btn--danger"
                disabled={loading}
                onClick={confirm}
                data-testid="growth-os-cancel-confirm"
              >
                {loading ? t`Opening billing…` : t`Cancel plan`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              type="button"
              className="gos-btn gos-btn--primary"
              onClick={onClose}
              data-autofocus
            >
              {t`Done`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

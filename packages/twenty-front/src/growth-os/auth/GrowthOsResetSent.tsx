import { useHandleResetPassword } from '@/auth/sign-in-up/hooks/useHandleResetPassword';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

import {
  growthOsResetCooldownSeconds,
  growthOsResetSentState,
} from '~/growth-os/auth/growthOsAuthAlertState';

export const GrowthOsStateIcon = ({ tone = 'info', kind }: { tone?: 'info' | 'danger' | 'success'; kind: 'mail' | 'clock' | 'lock' }) => (
  <div className={`gos-state-icon gos-state-icon-${tone}`} aria-hidden="true">
    {kind === 'mail' && (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    )}
    {kind === 'clock' && (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )}
    {kind === 'lock' && (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )}
  </div>
);

// Kit reset-sent card: neutral wording (never confirms an account exists),
// three next steps, resend with a live cooldown (60 s, then 120 s).
export const GrowthOsResetSentCard = () => {
  const { t } = useLingui();
  const [sent, setSent] = useAtomState(growthOsResetSentState);
  const { handleResetPassword } = useHandleResetPassword();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  if (!sent) return null;

  const wait = Math.max(
    0,
    growthOsResetCooldownSeconds(sent.sends) - Math.floor((now - sent.sentAt) / 1000),
  );
  const email = sent.email;

  return (
    <div className="gos-flow" data-testid="growth-os-reset-sent">
      <GrowthOsStateIcon kind="mail" />
      <h1 className="gos-auth-title">{t`Check your email`}</h1>
      <p className="gos-auth-sub">
        {t`If an account exists for`} <b>{email}</b>
        {t`, a reset link is on its way. The link works for 60 minutes.`}
      </p>
      <ol className="gos-steps">
        <li><span>1</span>{t`Open the email from ScalePoint Growth OS`}</li>
        <li><span>2</span>{t`Click “Choose a new password”`}</li>
        <li><span>3</span>{t`Not there after a minute? Check spam or promotions`}</li>
      </ol>
      <button
        type="button"
        className="gos-btn gos-btn-secondary gos-btn-block"
        disabled={wait > 0}
        onClick={() => handleResetPassword(email)()}
      >
        {t`Resend email`}
      </button>
      <div className="gos-meta-row">
        <span aria-live="polite">{wait > 0 ? t`You can resend in ${wait}s` : ''}</span>
        <button type="button" className="gos-linklike" onClick={() => setSent(null)}>
          {t`Use a different email`}
        </button>
      </div>
    </div>
  );
};

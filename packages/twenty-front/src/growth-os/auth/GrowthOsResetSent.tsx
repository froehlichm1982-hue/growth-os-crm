import { useHandleResetPassword } from '@/auth/sign-in-up/hooks/useHandleResetPassword';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

import {
  growthOsResetCooldownSeconds,
  growthOsResetSentState,
} from '~/growth-os/auth/growthOsAuthAlertState';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';

const GOS_STATE_ICONS = {
  mail: createGosIcon('mail', 'GosStateMail'),
  clock: createGosIcon('clock', 'GosStateClock'),
  lock: createGosIcon('lock', 'GosStateLock'),
};

export const GrowthOsStateIcon = ({ tone = 'info', kind }: { tone?: 'info' | 'danger' | 'success'; kind: 'mail' | 'clock' | 'lock' }) => {
  const StateIcon = GOS_STATE_ICONS[kind];
  return (
    <div className={`gos-state-icon gos-state-icon-${tone}`} aria-hidden="true">
      <StateIcon size={24} />
    </div>
  );
};

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
        {t`If an account exists for ${email}, a reset link is on its way. The link works for 60 minutes.`}
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

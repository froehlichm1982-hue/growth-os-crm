import { useHandleResetPassword } from '@/auth/sign-in-up/hooks/useHandleResetPassword';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

import {
  growthOsResetCooldownSeconds,
  growthOsResetSentState,
} from '~/growth-os/auth/growthOsAuthAlertState';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';

const GOS_STATE_ICONS = {
  mail: createGosIcon('mail', 'GosStateMail'),
  clock: createGosIcon('clock', 'GosStateClock'),
  lock: createGosIcon('lock-keyhole', 'GosStateLock'),
  shield: createGosIcon('shield-check', 'GosStateShield'),
};

// DS v2.9 `.gos-auth-status .bigicon` (tone: default info, `warn`, `danger`).
export const GrowthOsStateIcon = ({ tone = 'info', kind }: { tone?: 'info' | 'warn' | 'danger'; kind: keyof typeof GOS_STATE_ICONS }) => {
  const StateIcon = GOS_STATE_ICONS[kind];
  return (
    <span className={tone === 'info' ? 'bigicon' : `bigicon ${tone}`} aria-hidden="true">
      <StateIcon className="gos-icon" />
    </span>
  );
};

const GosArrowLeft = createGosIcon('arrow-left', 'GosBackArrow');

// Kit reset-sent card (DS v2.9 patterns/auth/crm/<lang>/reset-sent.html): neutral
// wording (never confirms an account exists), resend with a live cooldown
// (60 s, then 120 s). The reset link works once, for 60 minutes (server:
// PASSWORD_RESET_TOKEN_EXPIRES_IN=60m).
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
  const clock = `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}`;

  return (
    <div className="gos-auth-status" data-testid="growth-os-reset-sent">
      <GrowthOsStateIcon kind="mail" />
      <div className="head">
        <h1>{t`Check your inbox`}</h1>
        <p className="sub">
          <Trans>If an account exists for <b>{email}</b>, a reset link is on its way. It works once, for 60 minutes.</Trans>
        </p>
      </div>
      <button
        type="button"
        className="gos-btn gos-btn--secondary gos-btn--block gos-btn--lg"
        disabled={wait > 0}
        aria-describedby="growth-os-reset-cooldown"
        onClick={() => handleResetPassword(email)()}
      >
        {t`Resend link`}
      </button>
      <p className="gos-small gos-muted" id="growth-os-reset-cooldown" role="status">
        {wait > 0 ? t`You can resend in ${clock}. After that, the wait is 2 minutes.` : t`No email? Check your spam folder.`}
      </p>
      <button type="button" className="gos-link gos-tap gos-back growth-os-linklike" onClick={() => setSent(null)}>
        <GosArrowLeft className="gos-icon sm" />
        {t`Use a different email`}
      </button>
    </div>
  );
};

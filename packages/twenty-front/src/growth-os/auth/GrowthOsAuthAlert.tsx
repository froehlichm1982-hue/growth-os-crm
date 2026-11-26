import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

import { growthOsAuthAlertState } from '~/growth-os/auth/growthOsAuthAlertState';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';

const GosAlertIcon = createGosIcon('circle-alert', 'GosAuthAlertIcon');

const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// Top-of-card alert for sign-in errors and the 15-minute lockout countdown.
export const GrowthOsAuthAlert = ({ onResetPassword }: { onResetPassword?: () => void }) => {
  const { t } = useLingui();
  const [alert, setAlert] = useAtomState(growthOsAuthAlertState);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!alert?.lockedUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [alert?.lockedUntil]);

  useEffect(() => {
    if (alert?.lockedUntil && alert.lockedUntil <= now) setAlert(null);
  }, [alert?.lockedUntil, now, setAlert]);

  if (!alert) return null;

  const remaining = alert.lockedUntil
    ? Math.max(0, Math.ceil((alert.lockedUntil - now) / 1000))
    : null;

  return (
    <div className={`gos-alert gos-alert-${alert.tone}`} role="alert" data-testid="growth-os-auth-alert">
      <GosAlertIcon size={16} />
      <div>
        {remaining !== null ? (
          <>
            <b>{t`Too many attempts.`}</b>{' '}
            {t`Try again in ${formatCountdown(remaining)} or`}{' '}
            {onResetPassword ? (
              <button type="button" className="gos-linklike" onClick={onResetPassword}>
                {t`reset your password`}
              </button>
            ) : (
              t`reset your password`
            )}
            .
          </>
        ) : (
          <>
            <b>{alert.message}</b>
            {alert.tone === 'danger' && alert.kind !== 'oauth' && onResetPassword && (
              <>
                {' '}
                {t`Check both and try again, or`}{' '}
                <button type="button" className="gos-linklike" onClick={onResetPassword}>
                  {t`reset your password`}
                </button>
                .
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

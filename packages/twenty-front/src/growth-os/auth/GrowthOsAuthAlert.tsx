import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

import { growthOsAuthAlertState } from '~/growth-os/auth/growthOsAuthAlertState';

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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.8v3.6M8 10.9v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
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
            {alert.tone === 'danger' && onResetPassword && (
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

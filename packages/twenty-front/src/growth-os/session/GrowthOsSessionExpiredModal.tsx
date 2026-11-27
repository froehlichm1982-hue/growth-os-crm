import { useApolloClient } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '@/auth/hooks/useAuth';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import {
  GrowthOsEmailInput,
  GrowthOsPasswordInput,
} from '~/growth-os/auth/GrowthOsAuthFields';
import { growthOsParseLockedSeconds } from '~/growth-os/auth/growthOsAuthAlertState';
import { createGosIcon } from '~/growth-os/icons/createGosIcon';
import { growthOsSessionExpiredState } from '~/growth-os/session/growthOsSessionExpiredState';

import '~/growth-os/states/growth-os-states.css';

const GosAlertIcon = createGosIcon('circle-alert', 'GosSessionAlert');

const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// Session expired (§4): modal over the current page. Email is fixed (same
// account), password re-auth in place, then the active queries refetch so the
// page continues where it was. "Sign out" leaves for the sign-in page.
export const GrowthOsSessionExpiredModal = () => {
  const { t } = useLingui();
  const [expired, setExpired] = useAtomState(growthOsSessionExpiredState);
  const { signInWithCredentialsInWorkspace, signOut } = useAuth();
  const apolloClient = useApolloClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expired) return;
    setPassword('');
    setError(null);
    dialogRef.current
      ?.querySelector<HTMLInputElement>('input[type=password]')
      ?.focus({ preventScroll: true });
  }, [expired]);

  if (!expired) return null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError(t`Enter your password.`);

      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithCredentialsInWorkspace(expired.email, password);
      setExpired(null);
      await apolloClient.refetchQueries({ include: 'active' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      const lockedSeconds = growthOsParseLockedSeconds(message);
      const countdown = lockedSeconds ? formatCountdown(lockedSeconds) : '';

      setError(
        lockedSeconds
          ? t`Too many attempts. Try again in ${countdown} or reset your password.`
          : t`That email and password don’t match. Check both, or reset your password.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([readonly])',
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

  return createPortal(
    <div
      className="growth-os-modal-wrap gos-session-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gos-session-title"
      aria-describedby="gos-session-desc"
      onKeyDown={onKeyDown}
      data-testid="growth-os-session-expired"
    >
      <div className="growth-os-modal-scrim" />
      <div className="growth-os-modal" ref={dialogRef}>
        <form onSubmit={onSubmit} noValidate>
          <div className="growth-os-modal-h">
            <div>
              <h2 id="gos-session-title">{t`Your session expired`}</h2>
              <p id="gos-session-desc">
                {t`For your security we signed you out. Sign in again to continue. Unsaved changes in this tab are kept.`}
              </p>
            </div>
          </div>
          <div className="growth-os-modal-b">
            {error && (
              <div className="gos-alert" role="alert">
                <GosAlertIcon className="gos-icon" />
                <div>
                  {error}{' '}
                  <a href="/welcome">{t`Reset password`}</a>
                </div>
              </div>
            )}
            <GrowthOsEmailInput value={expired.email} readOnly />
            <GrowthOsPasswordInput
              mode="current"
              value={password}
              onChange={setPassword}
              email={expired.email}
            />
          </div>
          <div className="growth-os-modal-f">
            <button
              type="button"
              className="gos-btn gos-btn--secondary"
              onClick={() => {
                setExpired(null);
                void signOut();
              }}
            >
              {t`Sign out`}
            </button>
            <button
              type="submit"
              className="gos-btn gos-btn--primary"
              disabled={loading}
              aria-busy={loading || undefined}
              data-testid="growth-os-session-sign-in"
            >
              {t`Sign in`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

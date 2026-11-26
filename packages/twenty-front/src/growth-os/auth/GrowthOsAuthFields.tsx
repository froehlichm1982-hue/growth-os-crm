import { useLingui } from '@lingui/react/macro';
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import {
  GROWTH_OS_PASSWORD_MAX,
  growthOsCheckPassword,
  growthOsLoadCommonPasswords,
  growthOsPasswordScore,
} from '~/growth-os/auth/growthOsPasswordRules';

import './growth-os-auth-fields.css';

// Kit form fields for auth (product standard §4.1 / §4.2): label above the
// field, reserved message slot, 44px controls, password toggle + Caps Lock
// hint, live rules + 4-segment strength meter for new passwords.

const ErrorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 4.8v3.6M8 10.9v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const Eye = ({ off }: { off: boolean }) =>
  off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.8 9.8 0 0112 5c5 0 9 4.5 10 7a12.6 12.6 0 01-3.2 4.3M6.6 6.6C4.4 8 2.8 10.1 2 12c1 2.5 5 7 10 7a9.6 9.6 0 004.4-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );

type FieldShellProps = {
  id: string;
  label: string;
  labelAside?: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
};

const FieldShell = ({ id, label, labelAside, error, hint, children }: FieldShellProps) => (
  <div className="gos-field">
    <div className="gos-label-row">
      <label className="gos-label" htmlFor={id}>
        {label}
      </label>
      {labelAside}
    </div>
    {children}
    <div className="gos-slot">
      {error ? (
        <p className="gos-error" id={`${id}-err`}>
          <ErrorIcon />
          <span>{error}</span>
        </p>
      ) : null}
      {hint}
    </div>
  </div>
);

export const GrowthOsEmailInput = ({
  value,
  onChange,
  onBlur,
  error,
  autoFocus,
  autoComplete = 'username',
  readOnly,
  label,
}: {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  autoFocus?: boolean;
  autoComplete?: 'username' | 'email';
  readOnly?: boolean;
  label?: string;
}) => {
  const { t } = useLingui();
  const id = `gos-email-${useId()}`;

  return (
    <FieldShell id={id} label={label ?? t`Work email`} error={error}>
      <input
        className="gos-input"
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete={autoComplete}
        autoCapitalize="off"
        spellCheck={false}
        placeholder="name@company.com"
        value={value}
        readOnly={readOnly}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        onBlur={(event) => {
          const trimmed = event.target.value.trim();
          if (trimmed !== event.target.value) onChange?.(trimmed);
          onBlur?.();
        }}
      />
    </FieldShell>
  );
};

export const GrowthOsPasswordInput = ({
  value,
  onChange,
  onBlur,
  error,
  autoFocus,
  mode,
  email,
  labelAside,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  autoFocus?: boolean;
  mode: 'current' | 'new';
  email?: string | null;
  labelAside?: ReactNode;
  label?: string;
}) => {
  const { t } = useLingui();
  const id = `gos-password-${useId()}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [, setListLoaded] = useState(false);

  useEffect(() => {
    if (mode === 'new') {
      growthOsLoadCommonPasswords().then(() => setListLoaded(true));
    }
  }, [mode]);

  // Re-mask on submit so password managers store the value.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const remask = () => setVisible(false);
    form.addEventListener('submit', remask);

    return () => form.removeEventListener('submit', remask);
  }, []);

  const updateCaps = (event: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState?.('CapsLock') ?? false);

  const checks = growthOsCheckPassword(value, email);
  const score = growthOsPasswordScore(value, email);
  const scoreLabel = [t`Too weak`, t`Too weak`, t`Weak`, t`Good`, t`Strong`][score];
  const describedBy = [error ? `${id}-err` : null, capsLock ? `${id}-caps` : null, mode === 'new' ? `${id}-rules` : null]
    .filter(Boolean)
    .join(' ');

  const rule = (ok: boolean, text: string) => (
    <li data-ok={ok ? 'true' : 'false'}>
      {text}
      <span className="gos-sr-only">{ok ? t`met` : t`not met`}</span>
    </li>
  );

  return (
    <FieldShell
      id={id}
      label={label ?? t`Password`}
      labelAside={labelAside}
      error={error}
      hint={
        capsLock ? (
          <p className="gos-caps" id={`${id}-caps`}>
            <ErrorIcon /> {t`Caps Lock is on`}
          </p>
        ) : null
      }
    >
      <div className="gos-control">
        <input
          ref={inputRef}
          className="gos-input gos-has-toggle"
          id={id}
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
          autoCapitalize="off"
          spellCheck={false}
          maxLength={GROWTH_OS_PASSWORD_MAX * 2}
          value={value}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={updateCaps}
          onKeyUp={updateCaps}
          onBlur={() => {
            setCapsLock(false);
            onBlur?.();
          }}
        />
        <button
          type="button"
          className="gos-pw-toggle"
          aria-controls={id}
          aria-pressed={visible}
          aria-label={visible ? t`Hide password` : t`Show password`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const input = inputRef.current;
            const start = input?.selectionStart ?? null;
            const end = input?.selectionEnd ?? null;
            setVisible((v) => !v);
            requestAnimationFrame(() => {
              if (input && start !== null && end !== null && document.activeElement === input) {
                input.setSelectionRange(start, end);
              }
            });
          }}
        >
          <Eye off={visible} />
        </button>
      </div>
      {mode === 'new' && (
        <div id={`${id}-rules`}>
          <div className="gos-strength" data-score={score} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="gos-strength-row">
            <span>{t`Password strength`}</span>
            <b aria-live="polite">{value ? scoreLabel : ''}</b>
          </div>
          <ul className="gos-rules">
            {rule(checks.length && !checks.tooLong, t`At least 8 characters`)}
            {rule(checks.notCommon, t`Not a common or breached password`)}
            {rule(checks.notEmailName, t`Doesn’t contain your email name`)}
          </ul>
        </div>
      )}
    </FieldShell>
  );
};

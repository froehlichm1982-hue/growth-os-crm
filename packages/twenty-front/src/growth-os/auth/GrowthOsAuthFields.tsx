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

import { createGosIcon } from '~/growth-os/icons/createGosIcon';


// DS v2.9 form fields for auth (gos-field / gos-label / gos-input / gos-inputwrap
// gos-pw / gos-msg / gos-caps / gos-meter / gos-rules, from the CRM-scoped sheet):
// label above the field, reserved message slot, 44px controls, password toggle +
// Caps Lock hint, live rules + 4-segment strength meter for new passwords.

const GosCircleAlert = createGosIcon('circle-alert', 'GosFieldAlert');
const GosEye = createGosIcon('eye', 'GosEye');
const GosEyeOff = createGosIcon('eye-off', 'GosEyeOff');

const GosTriangleAlert = createGosIcon('triangle-alert', 'GosFieldCaps');

const ErrorIcon = () => <GosCircleAlert className="gos-icon sm" />;

const Eye = ({ off }: { off: boolean }) =>
  off ? <GosEyeOff className="gos-icon" /> : <GosEye className="gos-icon" />;

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
    {labelAside ? (
      <div className="gos-label gos-label--row">
        <label htmlFor={id}>{label}</label>
        {labelAside}
      </div>
    ) : (
      <label className="gos-label" htmlFor={id}>
        {label}
      </label>
    )}
    {children}
    {hint}
    <span className={error ? 'gos-msg gos-msg--error' : 'gos-msg'} id={`${id}-err`}>
      {error ? (
        <>
          <ErrorIcon />
          <span>{error}</span>
        </>
      ) : null}
    </span>
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
        aria-describedby={`${id}-err`}
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
  const describedBy = [mode === 'new' ? `${id}-rules` : null, `${id}-err`].filter(Boolean).join(' ');

  const rule = (ok: boolean, text: string) => (
    <li data-ok={ok ? 'true' : 'false'}>
      {text}
      <span className="gos-sr">{ok ? t`met` : t`not met`}</span>
    </li>
  );

  return (
    <FieldShell
      id={id}
      label={label ?? t`Password`}
      labelAside={labelAside}
      error={error}
      hint={
        <span className="gos-caps" data-on={capsLock ? 'true' : 'false'} role="status">
          <GosTriangleAlert className="gos-icon sm" />
          {capsLock ? t`Caps Lock is on` : ''}
        </span>
      }
    >
      <span className="gos-inputwrap gos-pw">
        <input
          ref={inputRef}
          className="gos-input"
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
      </span>
      {mode === 'new' && (
        <div id={`${id}-rules`}>
          <div className="gos-meter" data-score={score} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="gos-meter-row">
            <span>{t`Strength`}</span>
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

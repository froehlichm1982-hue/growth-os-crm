import { t } from '@lingui/core/macro';
import { type ReactNode, useMemo, useState } from 'react';

import '~/growth-os/auth/growth-os-auth-fields.css';
import '~/growth-os/states/growth-os-states.css';

// Growth OS CRM: kit states (PRODUCT-UX-STANDARD §3.3). Art is built from UI
// primitives (cards + icon), never stock illustrations.

const ICON_PATHS = {
  people:
    'M9 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM20 20l-3.5-3.5',
  alert: 'M12 3 2 20h20L12 3ZM12 10v4M12 17h.01',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  plus: 'M12 5v14M5 12h14',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  filterOff: 'M3 5h18l-7 8v6l-4 2v-8L3 5ZM2 2l20 20',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
} as const;

export type GrowthOsIconName = keyof typeof ICON_PATHS;

export const GrowthOsIcon = ({
  name,
  size = 20,
}: {
  name: GrowthOsIconName;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={ICON_PATHS[name]} />
  </svg>
);

export type GrowthOsStateAction = {
  label: string;
  onClick: () => void;
  icon?: GrowthOsIconName;
  testId?: string;
};

type GrowthOsEmptyStateProps = {
  icon: GrowthOsIconName;
  badge?: GrowthOsIconName;
  tone?: 'default' | 'danger';
  title: string;
  description: string;
  primary?: GrowthOsStateAction;
  secondary?: GrowthOsStateAction;
  more?: ReactNode;
  children?: ReactNode;
  testId?: string;
  width?: number;
};

const ActionButton = ({
  action,
  variant,
}: {
  action: GrowthOsStateAction;
  variant: 'primary' | 'secondary';
}) => (
  <button
    type="button"
    className={`gos-btn gos-btn-${variant}`}
    onClick={action.onClick}
    data-testid={action.testId}
  >
    {action.icon && <GrowthOsIcon name={action.icon} size={16} />}
    {action.label}
  </button>
);

export const GrowthOsEmptyState = ({
  icon,
  badge,
  tone = 'default',
  title,
  description,
  primary,
  secondary,
  more,
  children,
  testId,
  width,
}: GrowthOsEmptyStateProps) => (
  <div
    className="gos-empty-wrap"
    style={width ? { maxWidth: width } : undefined}
    data-testid={testId}
  >
    <section className="gos-empty" aria-labelledby={`${testId ?? 'gos'}-title`}>
      <div
        className={`gos-empty-art${tone === 'danger' ? ' danger' : ''}`}
        aria-hidden="true"
      >
        <div className="gos-card back" />
        <div className="gos-card front">
          <GrowthOsIcon name={icon} size={24} />
        </div>
        {badge && (
          <span className="gos-badge">
            <GrowthOsIcon name={badge} size={14} />
          </span>
        )}
      </div>
      <h2 id={`${testId ?? 'gos'}-title`}>{title}</h2>
      <p>{description}</p>
      {(primary || secondary) && (
        <div className="gos-actions">
          {primary && <ActionButton action={primary} variant="primary" />}
          {secondary && <ActionButton action={secondary} variant="secondary" />}
        </div>
      )}
      {more && <div className="gos-more">{more}</div>}
      {children}
    </section>
  </div>
);

const newReferenceId = () =>
  `GOS-${Date.now().toString(36).slice(-4).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

const formatCetTime = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);

// Error (load failed): what failed + Try again + reference id + CET time + Copy.
export const GrowthOsErrorState = ({
  title,
  description,
  onRetry,
  error,
  width,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
  error?: unknown;
  width?: number;
}) => {
  const { referenceId, time } = useMemo(() => {
    const id = newReferenceId();

    // Log once with the reference so support can match the report.
    // oxlint-disable-next-line no-console
    console.warn(`[growth-os] error reference ${id}`, error);

    return { referenceId: id, time: formatCetTime(new Date()) };
  }, [error]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${referenceId} · ${time}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <GrowthOsEmptyState
      icon="alert"
      tone="danger"
      testId="growth-os-error-state"
      title={title ?? t`Something went wrong on our side`}
      description={
        description ??
        t`We couldn’t load this view. Try again. If it keeps happening, send us the reference below.`
      }
      primary={{
        label: t`Try again`,
        onClick: onRetry,
        icon: 'refresh',
        testId: 'growth-os-error-retry',
      }}
      width={width}
    >
      <div className="gos-ref" role="note">
        <span>{t`Reference`}</span>
        <code data-testid="growth-os-error-reference">{referenceId}</code>
        <span>{time}</span>
        <button
          type="button"
          className="gos-btn gos-btn-ghost"
          onClick={copy}
          aria-live="polite"
        >
          <GrowthOsIcon name="copy" size={16} />
          {copied ? t`Copied` : t`Copy`}
        </button>
      </div>
    </GrowthOsEmptyState>
  );
};

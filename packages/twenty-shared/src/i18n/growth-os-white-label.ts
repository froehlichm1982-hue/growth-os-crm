import { type I18n } from '@lingui/core';

// Growth OS CRM white label (AGPL-3.0 fork of Twenty, see WHITE-LABEL.md).
// Single source of truth for the product name and customer-facing links used
// by twenty-front, twenty-emails and twenty-server.

export const GROWTH_OS_BRAND = {
  productName: 'Growth OS CRM',
  companyName: 'ScalePoint Ventures',
  companyLegalName: 'ScalePoint Ventures Oy',
  supportEmail: 'support@scalepoint-ventures.com',
  privacyEmail: 'privacy@scalepoint-ventures.com',
  // Public app URL; emails reference brand assets from here.
  appUrl: 'https://app.crm.scalepoint-ventures.com',
  marketingUrl: 'https://scalepoint-ventures.com/growthos/crm',
  // Open product decision: no help center yet, docs links land here.
  helpUrl: 'https://scalepoint-ventures.com/growthos/crm',
  legal: {
    terms: 'https://scalepoint-ventures.com/growthos/legal/terms',
    dpa: 'https://scalepoint-ventures.com/growthos/legal/dpa',
    privacy: 'https://scalepoint-ventures.com/growthos/legal/privacy',
    notice: 'https://scalepoint-ventures.com/growthos/legal/notice',
  },
  // AGPL-3.0 section 13 source offer. Placeholder until the public repository
  // URL is confirmed.
  sourceCodeUrl: 'https://github.com/froehlichmarkus-spv/growth-os-crm',
  upstreamName: 'Twenty',
  upstreamUrl: 'https://github.com/twentyhq/twenty',
} as const;

// Upstream copy names the product "Twenty". Translations are rewritten at
// runtime so upstream source strings and .po catalogs stay untouched
// (merge-friendly) and every locale is covered. Specific phrases first.
const REPLACEMENTS: Array<[RegExp, string]> = [
  [/Twenty\.com, Public Benefit Corporation/g, GROWTH_OS_BRAND.companyLegalName],
  [/\bTwenty team\b/gi, 'support'],
  [/\bTwenty fields\b/g, 'CRM fields'],
  [/\bTwenty CRM\b/g, GROWTH_OS_BRAND.productName],
  [/https?:\/\/docs\.twenty\.com[^\s)"'<]*/g, GROWTH_OS_BRAND.helpUrl],
  [/https?:\/\/(www\.)?twenty\.com\/[^\s)"'<]*/g, GROWTH_OS_BRAND.helpUrl],
  [/\byourco\.twenty\.com\b/g, 'yourco.crm.scalepoint-ventures.com'],
  [/\bmy-twenty-app\b/g, 'my-crm-app'],
  [/(^|[^\w.-])twenty\.com\b/g, '$1example.com'],
  [/\bTwenty's\b/g, `${GROWTH_OS_BRAND.productName}'s`],
  [/\bTwenty\b/g, GROWTH_OS_BRAND.productName],
];

export const rebrandText = (text: string): string =>
  typeof text !== 'string'
    ? text
    : REPLACEMENTS.reduce(
        (result, [pattern, replacement]) =>
          result.replace(pattern, replacement),
        text,
      );

const rebrandCatalogValue = (value: unknown): unknown => {
  if (typeof value === 'string') return rebrandText(value);
  if (Array.isArray(value)) return value.map(rebrandCatalogValue);
  return value;
};

export const rebrandMessages = <T extends Record<string, unknown>>(
  messages: T,
): T => {
  const result: Record<string, unknown> = {};

  for (const [id, message] of Object.entries(messages ?? {})) {
    result[id] = rebrandCatalogValue(message);
  }

  return result as T;
};

const REBRANDED = Symbol.for('growth-os.rebranded');

type MessageDescriptorLike = { id?: string; message?: string };

// Rebrands catalogs as they are loaded and source-text fallbacks as they are
// rendered. Interpolated values (user data such as record names) are never
// touched. Covers t``, msg``, <Trans> and i18n._() / i18n.t(). Idempotent.
export const withGrowthOsRebrand = <T extends I18n>(i18n: T): T => {
  const instance = i18n as T & { [REBRANDED]?: boolean };

  if (instance[REBRANDED] === true) {
    return i18n;
  }

  const originalLoad = i18n.load.bind(i18n) as (...args: unknown[]) => void;
  const originalTranslate = i18n._.bind(i18n) as (
    ...args: unknown[]
  ) => string;

  instance.load = ((...args: unknown[]) => {
    if (typeof args[0] === 'string') {
      return originalLoad(
        args[0],
        rebrandMessages(args[1] as Record<string, unknown>),
      );
    }

    const allMessages = (args[0] ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const rebranded: Record<string, Record<string, unknown>> = {};

    for (const [locale, messages] of Object.entries(allMessages)) {
      rebranded[locale] = rebrandMessages(messages);
    }

    return originalLoad(rebranded);
  }) as I18n['load'];

  const translate = ((
    id: string | MessageDescriptorLike,
    values?: unknown,
    options?: MessageDescriptorLike & Record<string, unknown>,
  ) => {
    if (typeof id === 'string') {
      const fallback = rebrandText(options?.message ?? id);

      return originalTranslate(id, values, { ...options, message: fallback });
    }

    return originalTranslate(
      {
        ...id,
        message: rebrandText(id?.message ?? id?.id ?? ''),
      },
      values,
      options,
    );
  }) as I18n['_'];

  instance._ = translate;
  (instance as { t: I18n['_'] }).t = translate;
  instance[REBRANDED] = true;

  // Catalogs loaded before wrapping.
  const loaded = (i18n as unknown as { _messages?: Record<string, Record<string, unknown>> })._messages;

  if (loaded !== undefined) {
    for (const locale of Object.keys(loaded)) {
      loaded[locale] = rebrandMessages(loaded[locale]);
    }
  }

  return i18n;
};

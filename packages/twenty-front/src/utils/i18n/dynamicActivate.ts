import { i18n } from '@lingui/core';
import { withGrowthOsRebrand } from 'twenty-shared/i18n';
import { APP_LOCALES, SOURCE_LOCALE } from 'twenty-shared/translations';

export const dynamicActivate = async (locale: keyof typeof APP_LOCALES) => {
  if (!Object.values(APP_LOCALES).includes(locale)) {
    // oxlint-disable-next-line no-console
    console.warn(`Invalid locale "${locale}", defaulting to "en"`);
    locale = SOURCE_LOCALE;
  }
  const { messages } = await import(`../../locales/generated/${locale}.ts`);
  // Growth OS CRM white label: rebrand upstream product name in all locales.
  withGrowthOsRebrand(i18n);
  i18n.load(locale, messages);
  i18n.activate(locale);
};

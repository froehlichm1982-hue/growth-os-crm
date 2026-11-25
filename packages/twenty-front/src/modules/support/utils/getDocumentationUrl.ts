import {
  DOCUMENTATION_BASE_URL,
  DOCUMENTATION_DEFAULT_LANGUAGE,
  DOCUMENTATION_DEFAULT_PATH,
  DOCUMENTATION_SUPPORTED_LANGUAGES,
  type DocumentationPath,
} from 'twenty-shared/constants';
import { GROWTH_OS_HELP_URL } from '~/growth-os/brand';

export const getDocumentationUrl = ({
  locale,
  path = DOCUMENTATION_DEFAULT_PATH,
}: {
  locale?: string | null;
  path?: DocumentationPath | string;
}): string => {
  // Growth OS CRM: upstream docs describe Twenty; send users to our help page.
  if (GROWTH_OS_HELP_URL.length > 0) {
    return GROWTH_OS_HELP_URL;
  }

  if (!locale) {
    return `${DOCUMENTATION_BASE_URL}${path}`;
  }

  // Extract language code from locale (e.g., 'fr' from 'fr-FR')
  const langCode = locale.split('-')[0].toLowerCase();

  // English content is served at root path (no /l/en/ prefix)
  if (langCode === DOCUMENTATION_DEFAULT_LANGUAGE) {
    return `${DOCUMENTATION_BASE_URL}${path}`;
  }

  const isSupported = DOCUMENTATION_SUPPORTED_LANGUAGES.includes(
    langCode as (typeof DOCUMENTATION_SUPPORTED_LANGUAGES)[number],
  );

  if (isSupported) {
    return `${DOCUMENTATION_BASE_URL}/l/${langCode}${path}`;
  }

  return `${DOCUMENTATION_BASE_URL}${path}`;
};

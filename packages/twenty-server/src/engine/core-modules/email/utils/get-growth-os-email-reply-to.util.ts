// Growth OS CRM: Reply-To for system mail. EMAIL_REPLY_TO, empty string = none.
export const GROWTH_OS_DEFAULT_EMAIL_REPLY_TO = 'support@scalepoint-ventures.com';

export const getGrowthOsEmailReplyTo = (): string | undefined => {
  const value = process.env.EMAIL_REPLY_TO;

  if (value === undefined) {
    return GROWTH_OS_DEFAULT_EMAIL_REPLY_TO;
  }

  return value.trim() === '' ? undefined : value.trim();
};

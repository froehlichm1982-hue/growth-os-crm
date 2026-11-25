export const INBOUND_EMAIL_MESSAGE_SOURCE = {
  SES_S3: 'SES_S3',
  RESEND: 'RESEND',
  // Growth OS: raw MIME pushed through the signed Growth OS inbound webhook
  GROWTH_OS_WEBHOOK: 'GROWTH_OS_WEBHOOK',
} as const;

import { randomBytes } from 'crypto';

export const GROWTH_OS_BCC_LOCAL_PART_PREFIX = 'log-';

export const buildGrowthOsBccAddress = (domain: string) =>
  `${GROWTH_OS_BCC_LOCAL_PART_PREFIX}${randomBytes(6).toString('hex')}@${domain.toLowerCase()}`;

export const isGrowthOsBccAddress = (address: string, domain: string) => {
  const normalized = address.trim().toLowerCase();

  return (
    normalized.startsWith(GROWTH_OS_BCC_LOCAL_PART_PREFIX) &&
    normalized.endsWith(`@${domain.toLowerCase()}`)
  );
};

export const getGrowthOsInboundEmailDomain = () =>
  (process.env.INBOUND_EMAIL_DOMAIN ?? '').trim().toLowerCase();

// Which inbound path feeds the BCC inbox:
// - `webhook` (default): POST /webhooks/growth-os-inbound, signed with
//   GROWTH_OS_INBOUND_WEBHOOK_SECRET (any MX/forwarding service that can POST
//   raw MIME, and the local simulator scripts/growth-os-inbound-mail-mock.ts)
// - `resend`: Resend Inbound (email.received) via the existing
//   /webhooks/messaging/resend endpoint, needs RESEND_API_KEY
export const getGrowthOsInboundProvider = (): 'webhook' | 'resend' =>
  process.env.GROWTH_OS_INBOUND_PROVIDER === 'resend' ? 'resend' : 'webhook';

export const isGrowthOsInboundConfigured = () => {
  if (getGrowthOsInboundEmailDomain() === '') {
    return false;
  }

  return getGrowthOsInboundProvider() === 'resend'
    ? (process.env.RESEND_API_KEY ?? '') !== ''
    : (process.env.GROWTH_OS_INBOUND_WEBHOOK_SECRET ?? '') !== '';
};

// Envelope recipients may be given as "Name <addr>"; keep the address only.
export const normalizeEnvelopeRecipient = (value: string) => {
  const match = value.match(/<([^>]+)>/);

  return (match ? match[1] : value).trim().toLowerCase();
};

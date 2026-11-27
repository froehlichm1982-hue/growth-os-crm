import { createHmac, timingSafeEqual } from 'crypto';

import { GROWTH_OS_WEBHOOK_TOLERANCE_SECONDS } from 'src/engine/core-modules/growth-os/growth-os-plan.constants';

// Header format: `X-Growth-OS-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>`
// signed payload = `${t}.${rawBody}` with GROWTH_OS_BILLING_WEBHOOK_SECRET.
export const signGrowthOsPayload = (
  secret: string,
  rawBody: string,
  timestamp: number = Math.floor(Date.now() / 1000),
) => {
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
};

export type GrowthOsSignatureCheck =
  | { ok: true }
  | { ok: false; reason: string };

export const verifyGrowthOsSignature = ({
  secret,
  rawBody,
  header,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = GROWTH_OS_WEBHOOK_TOLERANCE_SECONDS,
}: {
  secret: string | undefined;
  rawBody: string | undefined;
  header: string | undefined;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): GrowthOsSignatureCheck => {
  if (!secret) return { ok: false, reason: 'webhook secret not configured' };
  if (!rawBody) return { ok: false, reason: 'empty body' };
  if (!header) return { ok: false, reason: 'missing signature header' };

  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [key, ...rest] = part.trim().split('=');

      return [key, rest.join('=')];
    }),
  );
  const timestamp = Number(parts.t);
  const provided = parts.v1;

  if (!Number.isFinite(timestamp) || !provided) {
    return { ok: false, reason: 'malformed signature header' };
  }

  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, reason: 'timestamp outside tolerance' };
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(provided, 'hex');

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return { ok: false, reason: 'signature mismatch' };
  }

  return { ok: true };
};

// growth-os-billing signs pushes with one HMAC and sends two header styles:
//   X-Growth-OS-Signature: t=<unix>,v1=<hex>   or   X-GOS-Timestamp + X-GOS-Signature: v1=<hex>
// This returns the first style, building it from the second when needed.
export const pickGrowthOsSignatureHeader = (
  headers: Record<string, string | string[] | undefined>,
): string | undefined => {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const primary = first(headers['x-growth-os-signature']);

  if (primary) return primary;

  const timestamp = first(headers['x-gos-timestamp']);
  const signature = first(headers['x-gos-signature']);

  return timestamp && signature?.startsWith('v1=')
    ? `t=${timestamp},v1=${signature.slice(3)}`
    : undefined;
};

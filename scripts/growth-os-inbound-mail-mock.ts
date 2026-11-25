// Local stand-in for an inbound mail provider: builds an RFC 5322 message,
// signs it and POSTs it to the BCC inbox webhook. Never sends real mail.
//
//   GROWTH_OS_INBOUND_WEBHOOK_SECRET=... npx tsx scripts/growth-os-inbound-mail-mock.ts \
//     --to log-…@<INBOUND_EMAIL_DOMAIN> [--from "Name <a@b.example>"] [--cc "c@d.example"] \
//     [--subject "…"] [--text "…"] [--url http://127.0.0.1:3000] [--bad-signature]
import { createHmac, randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : fallback;
};

const secret = process.env.GROWTH_OS_INBOUND_WEBHOOK_SECRET;
const to = flag('to');

if (!secret || !to) {
  console.error(
    'Usage: GROWTH_OS_INBOUND_WEBHOOK_SECRET=... tsx scripts/growth-os-inbound-mail-mock.ts --to log-…@<domain>',
  );
  process.exit(2);
}

const url = `${flag('url', 'http://127.0.0.1:3000')}/webhooks/growth-os-inbound`;
const from = flag('from', 'Katrin Vogel <katrin.vogel@kestrel-logistics.example>');
const visibleTo = flag('visible-to', 'Lena Hartmann <lena@getnordlicht.example>');
const cc = flag('cc');
const subject = flag('subject', 'Renewal terms for 2027');
const text = flag(
  'text',
  'Hi Lena,\r\n\r\nthanks for the call. Attached are our notes on the renewal.\r\n\r\nBest,\r\nKatrin',
);
const domain = (from.match(/@([^>]+)>?$/)?.[1] ?? 'local.example').trim();

const raw = [
  `From: ${from}`,
  `To: ${visibleTo}`,
  ...(cc ? [`Cc: ${cc}`] : []),
  `Subject: ${subject}`,
  `Date: ${new Date().toUTCString()}`,
  `Message-ID: <${randomUUID()}@${domain}>`,
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=utf-8',
  'Content-Transfer-Encoding: 8bit',
  '',
  text,
  '',
].join('\r\n');

const body = JSON.stringify({
  recipients: [to],
  raw: Buffer.from(raw, 'utf-8').toString('base64'),
});
const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac(
  'sha256',
  args.includes('--bad-signature') ? 'wrong-secret' : secret,
)
  .update(`${timestamp}.${body}`)
  .digest('hex');

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-growth-os-signature': `t=${timestamp},v1=${signature}`,
  },
  body,
});

console.log(response.status, await response.text());
process.exit(response.ok ? 0 : 1);

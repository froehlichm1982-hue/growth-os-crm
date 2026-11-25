// Local stand-in for growth-os-billing: sends signed `entitlement.updated`
// events to the CRM webhook. Never talks to Stripe.
//
//   GROWTH_OS_BILLING_WEBHOOK_SECRET=... npx tsx scripts/growth-os-billing-mock.ts <scenario> \
//     --workspace <uuid> [--plan growth] [--seats 10] [--interval month|year] \
//     [--url http://localhost:3000] [--bad-signature]
//
// Scenarios: subscribe | upgrade | seats | past-due | cancel | unpaid | trial | raw
//   subscribe  active, --plan (default starter), --seats (default 3)
//   upgrade    active, --plan (default growth), --seats (default 10)
//   seats      active, same plan as --plan, new --seats
//   past-due   past_due (7-day grace, then read-only)
//   cancel     canceled (paid features paused; read-only after grace)
//   unpaid     unpaid (as cancel)
//   trial      trialing with --trial-ends <ISO> (e.g. a past date to simulate expiry)
import { createHmac, randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const scenario = args[0];
const flag = (name: string, fallback?: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : fallback;
};
const has = (name: string) => args.includes(`--${name}`);

const secret = process.env.GROWTH_OS_BILLING_WEBHOOK_SECRET;
const workspaceId = flag('workspace');
const url = `${flag('url', 'http://localhost:3000')}/webhooks/growth-os-billing`;

if (!secret || !workspaceId || !scenario) {
  console.error(
    'Usage: GROWTH_OS_BILLING_WEBHOOK_SECRET=... tsx scripts/growth-os-billing-mock.ts <scenario> --workspace <uuid>',
  );
  process.exit(2);
}

const now = new Date();
const inDays = (days: number) =>
  new Date(now.getTime() + days * 86_400_000).toISOString();

const defaults: Record<string, Record<string, unknown>> = {
  subscribe: { plan: 'starter', status: 'active', seats: 3 },
  upgrade: { plan: 'growth', status: 'active', seats: 10 },
  seats: { plan: 'growth', status: 'active', seats: 5 },
  'past-due': { plan: 'growth', status: 'past_due', seats: 10 },
  cancel: { plan: 'growth', status: 'canceled', seats: 10 },
  unpaid: { plan: 'growth', status: 'unpaid', seats: 10 },
  trial: { plan: 'growth', status: 'trialing', seats: null },
};

if (!defaults[scenario]) {
  console.error(`Unknown scenario ${scenario}`);
  process.exit(2);
}

const interval = flag('interval', 'month');
const plan = flag('plan', defaults[scenario].plan as string);
const seatsFlag = flag('seats');
const data = {
  workspaceId,
  ...defaults[scenario],
  plan,
  seats: seatsFlag ? Number(seatsFlag) : defaults[scenario].seats,
  interval,
  lookupKey: `crm_${plan}_${interval === 'year' ? 'y' : 'm'}`,
  currentPeriodEnd: flag(
    'period-end',
    scenario === 'cancel' ? now.toISOString() : inDays(interval === 'year' ? 365 : 30),
  ),
  trialEndsAt: scenario === 'trial' ? flag('trial-ends', inDays(14)) : null,
  customerRef: 'mock_customer',
};

const body = JSON.stringify({
  id: `evt_mock_${randomUUID()}`,
  type: 'entitlement.updated',
  createdAt: now.toISOString(),
  data,
});
const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac('sha256', has('bad-signature') ? 'wrong' : secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');

const main = async () => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Growth-OS-Signature': `t=${timestamp},v1=${signature}`,
    },
    body,
  });

  console.log(response.status, await response.text());
  process.exit(response.ok ? 0 : 1);
};

void main();

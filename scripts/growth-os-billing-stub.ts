// Local fake of growth-os-billing (test mode). NOT the real service and never talks to
// Stripe: it implements the documented endpoints, the HMAC signatures (both header
// styles, 300 s tolerance), the signed GET /portal link, the entitlement state machine
// and the signed `entitlement.updated` pushes, so the CRM can be tested end to end.
//
//   STUB_SECRET=<local test secret> STUB_PUSH_URL=http://127.0.0.1:3000/webhooks/growth-os-billing \
//     npx tsx scripts/growth-os-billing-stub.ts            # listens on 127.0.0.1:4010
//
// Billing API (module-authenticated):  POST /v1/accounts · GET /v1/entitlements ·
//   POST /v1/checkout-sessions · POST /v1/portal-sessions · POST /v1/seats ·
//   POST /v1/accounts/{external_user_id}/cancel · GET /portal · GET /healthz
// Stub controls (stand-in for Stripe + time; loopback only):
//   POST /__stub/checkout/{id}/pay · POST /__stub/{ext}/fail-payment · /recover ·
//   /advance {days} · POST /l/{token} (cancel confirmation page) · GET /__stub/log ·
//   POST /__stub/{ext}/replay-last · /push-stale
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const SECRET = process.env.STUB_SECRET ?? '';
const PORT = Number(process.env.STUB_PORT ?? 4010);
const PUSH_URL = process.env.STUB_PUSH_URL ?? 'http://127.0.0.1:3000/webhooks/growth-os-billing';
const PUBLIC = process.env.STUB_PUBLIC_URL ?? `http://127.0.0.1:${PORT}`;
const TOLERANCE = 300;
const DAY = 86_400;

if (!SECRET) {
  console.error('STUB_SECRET is required (a local test secret, never the real one)');
  process.exit(2);
}

let clockOffset = 0; // seconds; the stub can move time forward
const now = () => Math.floor(Date.now() / 1000) + clockOffset;
const iso = (t: number | null) => (t === null ? null : new Date(t * 1000).toISOString());

// Catalog (matrix): crm_<tier>_m / _y, seat caps 3 / 25 / unlimited.
const PLANS: Record<string, { plan: string; interval: 'month' | 'year'; maxSeats: number | null }> = {};
for (const [plan, maxSeats] of [['starter', 3], ['growth', 25], ['scale', null]] as const) {
  PLANS[`crm_${plan}_m`] = { plan, interval: 'month', maxSeats };
  PLANS[`crm_${plan}_y`] = { plan, interval: 'year', maxSeats };
}

type Account = {
  id: string; org: string; ext: string; email?: string; name?: string; locale?: string;
  status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'read_only';
  underlying: string | null; plan: string | null; interval: string | null; seats: number;
  seatsUsed: number; lookupKey: string | null; trialEndsAt: number | null;
  periodEnd: number | null; cancelAtPeriodEnd: boolean; graceUntil: number | null;
  readOnly: boolean; version: number;
};
const accounts = new Map<string, Account>(); // key = ext (workspace id)
const checkouts = new Map<string, { ext: string; lookupKey: string; qty: number; successUrl: string }>();
const links = new Map<string, { kind: 'cancel_item' | 'undo_cancel'; ext: string; returnUrl: string }>();
const log: Array<Record<string, unknown>> = [];
const pushes: Array<{ eventId: string; version: number; status: string; httpStatus: number | string; result?: string; ext: string; body: string }> = [];

const sign = (body: string, t = now()) =>
  ({ t, mac: createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex') });
const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a, 'utf8'); const y = Buffer.from(b, 'utf8');

  return x.length === y.length && timingSafeEqual(x, y);
};

const verify = (req: IncomingMessage, raw: string): string | null => {
  const h = req.headers;
  let ts: string | undefined; let mac: string | undefined;
  const first = h['x-growth-os-signature'] as string | undefined;

  if (first) {
    const parts = Object.fromEntries(first.split(',').map((p) => p.trim().split('=', 2) as [string, string]));
    ts = parts.t; mac = parts.v1;
  } else if (h['x-gos-timestamp'] && String(h['x-gos-signature'] ?? '').startsWith('v1=')) {
    ts = String(h['x-gos-timestamp']); mac = String(h['x-gos-signature']).slice(3);
  }
  if (!ts || !mac) return 'missing credentials';
  const t = Number(ts);

  if (!Number.isFinite(t)) return 'bad timestamp';
  if (Math.abs(Math.floor(Date.now() / 1000) - t) > TOLERANCE) return 'timestamp outside tolerance';

  return safeEq(sign(raw, t).mac, mac) ? null : 'bad signature';
};

const entitlementData = (a: Account) => {
  const status = a.status === 'read_only' ? (a.underlying === 'past_due' ? 'past_due' : 'canceled') : a.status === 'none' ? 'trialing' : a.status;

  return {
    workspaceId: a.ext, plan: a.plan ?? 'starter', status,
    seats: a.seats > 0 ? a.seats : null, interval: a.interval,
    trialEndsAt: iso(a.trialEndsAt), currentPeriodEnd: iso(a.periodEnd),
    customerRef: a.org, readOnly: a.readOnly, cancelAtPeriodEnd: a.cancelAtPeriodEnd,
    graceUntil: iso(a.graceUntil), lookupKey: a.lookupKey,
  };
};
const entResponse = (a: Account) => ({
  version: a.version,
  data: entitlementData(a),
  entitlement: { status: a.status, plan: a.plan, seats: a.seats, read_only: a.readOnly, cancel_at_period_end: a.cancelAtPeriodEnd, grace_until: iso(a.graceUntil), lookup_key: a.lookupKey, version: a.version },
});

const push = async (a: Account, opts: { version?: number; eventId?: string } = {}) => {
  const version = opts.version ?? ++a.version;
  const eventId = opts.eventId ?? `evt_gos_${a.id}_${version}`;
  const body = JSON.stringify({ id: eventId, type: 'entitlement.updated', version, createdAt: iso(now()), data: entitlementData(a) });
  const { t, mac } = sign(body);
  let httpStatus: number | string;
  let result: string | undefined;

  try {
    const r = await fetch(PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'User-Agent': 'growth-os-billing/1',
        'X-Growth-OS-Event-Id': eventId, 'X-Growth-OS-Signature': `t=${t},v1=${mac}`,
        'X-GOS-Timestamp': String(t), 'X-GOS-Signature': `v1=${mac}`,
      },
      body,
    });
    httpStatus = r.status;
    result = ((await r.json().catch(() => ({}))) as { result?: string }).result;
  } catch (error) {
    httpStatus = `error ${(error as Error).message}`;
  }
  pushes.push({ eventId, version, status: entitlementData(a).status, httpStatus, result, ext: a.ext, body });

  return { eventId, version, httpStatus, result };
};

const ensureAccount = (ext: string, b: Record<string, any>) => {
  let a = accounts.get(ext);

  if (!a) {
    a = {
      id: `acc_${randomUUID().replace(/-/g, '').slice(0, 12)}`, org: `org_${randomUUID().replace(/-/g, '').slice(0, 10)}`,
      ext, email: b.email, name: b.name, locale: b.locale, status: 'none', underlying: null, plan: null,
      interval: null, seats: 0, seatsUsed: 1, lookupKey: null, trialEndsAt: null, periodEnd: null,
      cancelAtPeriodEnd: false, graceUntil: null, readOnly: false, version: 1,
    };
    if (b.trial) { a.status = 'trialing'; a.plan = 'growth'; a.trialEndsAt = now() + 14 * DAY; }
    accounts.set(ext, a);
  }

  return a;
};

const allowedReturn = (value?: string) => {
  if (!value) return null;
  const u = new URL(value);
  const own = u.hostname === 'scalepoint-ventures.com' || u.hostname.endsWith('.scalepoint-ventures.com');
  const loop = ['127.0.0.1', 'localhost'].includes(u.hostname);

  if ((u.protocol === 'https:' && own) || loop) return value;
  throw Object.assign(new Error(`Return host ${u.hostname} is not allowed for crm`), { status: 400, code: 'return_url_not_allowed' });
};

const send = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  const isString = typeof body === 'string';

  res.writeHead(status, { 'Content-Type': isString ? 'text/html; charset=utf-8' : 'application/json', ...headers });
  res.end(isString ? body : JSON.stringify(body));
};
const page = (title: string, body: string, form?: string) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title><h1>${title}</h1><p>${body}</p>${form ?? ''}`;

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => resolve(d)); });

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', PUBLIC);
  const raw = await readBody(req);
  const path = url.pathname;
  const entry: Record<string, unknown> = { at: iso(now()), method: req.method, path };
  const record = (extra: Record<string, unknown> = {}) => {
    if (!log.includes(entry)) log.push(entry);
    Object.assign(entry, extra);
  };

  try {
    if (path === '/healthz') return send(res, 200, { ok: true, livemode: false, stub: true });

    // ---- stub controls ---------------------------------------------------
    if (path === '/__stub/log') return send(res, 200, { log, pushes, clockOffset, accounts: [...accounts.values()] });
    let m = path.match(/^\/__stub\/checkout\/([^/]+)\/pay$/);

    if (m) {
      const c = checkouts.get(m[1]);
      const a = c && accounts.get(c.ext);

      if (!c || !a) return send(res, 404, { error: 'unknown_checkout' });
      const p = PLANS[c.lookupKey];

      a.status = 'active'; a.underlying = null; a.plan = p.plan; a.interval = p.interval; a.lookupKey = c.lookupKey;
      a.seats = p.maxSeats ? Math.min(c.qty, p.maxSeats) : c.qty; a.cancelAtPeriodEnd = false; a.graceUntil = null; a.readOnly = false;
      a.trialEndsAt = null; a.periodEnd = now() + (p.interval === 'year' ? 365 : 30) * DAY;
      const r = await push(a);

      return send(res, 200, { ok: true, redirect: c.successUrl, push: r });
    }
    m = path.match(/^\/__stub\/([^/]+)\/(fail-payment|recover|advance|replay-last|push-stale)$/);
    if (m) {
      const a = accounts.get(decodeURIComponent(m[1]));

      if (!a) return send(res, 404, { error: 'unknown_account' });
      const b = raw ? JSON.parse(raw) : {};

      if (m[2] === 'fail-payment') {
        a.status = 'past_due'; a.underlying = 'past_due'; a.graceUntil = now() + 7 * DAY; a.readOnly = false;

        return send(res, 200, { ok: true, push: await push(a) });
      }
      if (m[2] === 'recover') {
        a.status = 'active'; a.underlying = null; a.graceUntil = null; a.readOnly = false;

        return send(res, 200, { ok: true, push: await push(a) });
      }
      if (m[2] === 'advance') {
        clockOffset += Math.round(Number(b.days ?? 0) * DAY);
        const t = now(); const out: unknown[] = [];

        if (a.status === 'trialing' && a.trialEndsAt && t >= a.trialEndsAt) { a.status = 'canceled'; a.graceUntil = a.trialEndsAt + 7 * DAY; out.push(await push(a)); }
        else if (a.status === 'active' && a.cancelAtPeriodEnd && a.periodEnd && t >= a.periodEnd) { a.status = 'canceled'; a.graceUntil = a.periodEnd + 7 * DAY; a.cancelAtPeriodEnd = false; out.push(await push(a)); }
        if ((a.status === 'past_due' || a.status === 'canceled') && a.graceUntil && t >= a.graceUntil && !a.readOnly) {
          a.underlying = a.status; a.status = 'read_only'; a.readOnly = true; out.push(await push(a));
        }

        return send(res, 200, { ok: true, clockOffset, pushes: out });
      }
      if (m[2] === 'replay-last') {
        const last = [...pushes].reverse().find((x) => x.ext === a.ext && !x.eventId.startsWith('evt_stale_'));
        const { t, mac } = sign(last!.body);
        const r = await fetch(PUSH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Growth-OS-Event-Id': last!.eventId, 'X-Growth-OS-Signature': `t=${t},v1=${mac}`, 'X-GOS-Timestamp': String(t), 'X-GOS-Signature': `v1=${mac}` }, body: last!.body });

        return send(res, 200, { ok: true, httpStatus: r.status, result: ((await r.json().catch(() => ({}))) as { result?: string }).result });
      }
      // push-stale: an older version (must be ignored by the CRM)
      const staleVersion = Math.max(0, a.version - 2);
      const saved = { status: a.status, readOnly: a.readOnly };

      a.status = 'active'; a.readOnly = false;
      const r = await push(a, { version: staleVersion, eventId: `evt_stale_${randomUUID().slice(0, 8)}` });

      a.status = saved.status as Account['status']; a.readOnly = saved.readOnly;

      return send(res, 200, { ok: true, push: r });
    }

    // ---- hosted pages ----------------------------------------------------
    m = path.match(/^\/l\/([^/]+)$/);
    if (m) {
      const l = links.get(m[1]);

      if (!l) return send(res, 410, page('Link expired', 'This link is no longer valid.'));
      if (req.method === 'GET') {
        return send(res, 200, page(l.kind === 'cancel_item' ? 'Cancel CRM?' : 'Undo cancellation?',
          'You keep full access until the end of the period. After that 7 days of Starter limits, then read-only. Nothing is deleted.',
          `<form method="post"><button>${l.kind === 'cancel_item' ? 'Cancel CRM' : 'Keep my plan'}</button></form>`));
      }
      const a = accounts.get(l.ext)!;

      a.cancelAtPeriodEnd = l.kind === 'cancel_item';
      await push(a);
      links.delete(m[1]);
      record({ event: l.kind });

      return send(res, 303, '', { Location: l.returnUrl });
    }
    m = path.match(/^\/checkout\/([^/]+)$/);
    if (m) return send(res, 200, page('Checkout (stub)', 'Stub checkout page. Payment is simulated by POST /__stub/checkout/<id>/pay.'));

    if (path === '/portal') {
      const q = url.searchParams;
      const [a, mod, exp, sig] = [q.get('a') ?? '', q.get('m') ?? '', q.get('exp') ?? '', q.get('sig') ?? ''];
      const expected = createHmac('sha256', SECRET).update(`portal.${mod}.${a}.${exp}`).digest('hex');
      const e = Number(exp);
      let status = 'ok';

      if (!sig || a.length > 80 || !Number.isFinite(e) || !safeEq(expected, sig.toLowerCase()) || e > now() + 14 * DAY) status = 'invalid';
      else if (e < now()) status = 'expired';
      record({ event: 'portal', status, account: a, module: mod });
      const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };

      if (status === 'ok') return send(res, 200, page('Billing portal (stub)', `Billing portal for ${a}.`), headers);

      return send(res, status === 'expired' ? 410 : 400, page('Link not valid', status), headers);
    }

    // ---- module API (authenticated) ------------------------------------------
    if (path.startsWith('/v1/') || path.startsWith('/crm/')) {
      const authError = verify(req, req.method === 'GET' ? '' : raw);

      record({ auth: authError ?? 'ok' });
      if (authError) return send(res, 401, { error: 'unauthorized', message: authError });
      const b: Record<string, any> = req.method === 'GET' ? Object.fromEntries(url.searchParams) : raw ? JSON.parse(raw) : {};

      if (b.product !== 'crm') return send(res, 400, { error: 'invalid_product', message: 'product must be one of crm' });
      const ext = (m = path.match(/^\/v1\/accounts\/([^/]+)\/cancel$/)) ? decodeURIComponent(m[1]) : String(b.external_user_id ?? b.external_id ?? b.workspaceId ?? '');

      if (!ext) return send(res, 400, { error: 'invalid', message: 'external_user_id is required' });
      record({ ext, body: path.includes('portal') || path.includes('checkout') ? { ...b, email: undefined } : undefined });

      if (path === '/v1/accounts' && req.method === 'POST') {
        const a = ensureAccount(ext, b);

        return send(res, 201, { account_id: a.id, organisation_id: a.org, ...entResponse(a) });
      }
      if (path === '/v1/entitlements') {
        const a = accounts.get(ext);

        return a ? send(res, 200, entResponse(a)) : send(res, 404, { error: 'unknown_account' });
      }
      if (path === '/v1/checkout-sessions') {
        const a = ensureAccount(ext, b);
        const lookupKey = String(b.price_lookup_key ?? `crm_${b.plan}_${b.interval === 'year' ? 'y' : 'm'}`);

        if (!PLANS[lookupKey]) return send(res, 400, { error: 'unknown_price', message: lookupKey });
        const success = allowedReturn(b.success_url) ?? 'https://crm.scalepoint-ventures.com/settings/billing?checkout=success';

        allowedReturn(b.cancel_url);
        if (a.status === 'active' && a.lookupKey === lookupKey) return send(res, 200, { url: success, mode: 'noop' });
        const id = `cs_${randomUUID().replace(/-/g, '').slice(0, 14)}`;

        checkouts.set(id, { ext, lookupKey, qty: Math.max(1, Number(b.quantity ?? b.seats ?? 1)), successUrl: success });

        return send(res, 200, { url: `${PUBLIC}/checkout/${id}`, mode: a.status === 'active' ? 'confirm' : 'checkout', id });
      }
      if (path === '/v1/portal-sessions') {
        const a = ensureAccount(ext, b);
        const returnUrl = allowedReturn(b.return_url) ?? 'https://crm.scalepoint-ventures.com/settings/billing';

        if (b.flow === 'cancel') {
          const tok = randomUUID().replace(/-/g, '');

          links.set(tok, { kind: a.cancelAtPeriodEnd ? 'undo_cancel' : 'cancel_item', ext, returnUrl });

          return send(res, 200, { url: `${PUBLIC}/l/${tok}` });
        }

        return send(res, 200, { url: `${PUBLIC}/portal-session/${a.id}${b.flow ? `?flow=${b.flow}` : ''}` });
      }
      if (path === '/v1/seats') {
        const a = accounts.get(ext);

        if (!a) return send(res, 404, { error: 'unknown_account' });
        const n = Math.max(1, Number(b.seats ?? b.seatsUsed ?? 1));

        a.seatsUsed = n;
        if (a.status !== 'active' && a.status !== 'past_due') return send(res, 200, { changed: false, reason: 'no_live_subscription' });
        const cap = PLANS[a.lookupKey ?? '']?.maxSeats ?? null;
        const q = cap ? Math.min(n, cap) : n;

        if (q === a.seats) return send(res, 200, { changed: false, quantity: a.seats });
        a.seats = q;
        await push(a);

        return send(res, 200, { changed: true, quantity: q });
      }
      if (m) {
        const a = accounts.get(ext);

        if (!a) return send(res, 404, { error: 'unknown_account' });
        if (b.at_period_end) a.cancelAtPeriodEnd = true;
        else { a.status = 'canceled'; a.graceUntil = now(); a.readOnly = true; a.underlying = 'canceled'; a.status = 'read_only'; }
        await push(a);

        return send(res, 200, entResponse(a));
      }
      if (path === '/crm/seats') return send(res, 204, '');
    }

    return send(res, 404, { error: 'not_found' });
  } catch (error) {
    const e = error as Error & { status?: number; code?: string };

    return send(res, e.status ?? 500, { error: e.code ?? 'error', message: e.message });
  }
};

createServer(handler).listen(PORT, '127.0.0.1', () => console.log(`growth-os-billing STUB listening on ${PUBLIC} (push -> ${PUSH_URL})`));

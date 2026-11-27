# Growth OS CRM — plans, entitlements and the billing hook

This fork enforces Growth OS CRM plans **inside the CRM** (AGPL side) and
receives plan changes from the separate, closed **growth-os-billing** service
over a signed webhook. The CRM contains **no payment-provider SDK, no provider keys and no
checkout code**. Upstream Enterprise billing stays off (`IS_BILLING_ENABLED=false`).

Code: `packages/twenty-server/src/engine/core-modules/growth-os/`
UI: `packages/twenty-front/src/growth-os/plan/` (Settings → Plan & Billing),
signup pricing panel in `packages/twenty-front/src/growth-os/GrowthOsAuthShell.tsx`.
Prices/copy are single-sourced in `packages/twenty-shared/src/i18n/growth-os-white-label.ts`
(`GROWTH_OS_PRICING`).

## Plans

| | Starter | Growth | Scale |
|---|---|---|---|
| Price (net, per user / month) | €12 | €24 | €39 |
| Yearly (per user / year, = 10 × monthly) | €120 | €240 | €390 |
| Price lookup keys (billing service) | `crm_starter_m` / `crm_starter_y` | `crm_growth_m` / `crm_growth_y` | `crm_scale_m` / `crm_scale_y` |
| Users (seats) | 3 | 25 | unlimited |
| Pipelines (Kanban views on Opportunities) | 1 | unlimited | unlimited |
| Custom fields per object | 10 | unlimited | unlimited |
| Custom objects | – | ✓ | ✓ |
| Email & calendar sync (Google, Microsoft, IMAP/SMTP/CalDAV) | – | ✓ | ✓ |
| Workflows (activate + run) | – | ✓ | ✓ |
| Custom roles | – | ✓ | ✓ |
| API keys, REST/GraphQL API, webhooks | – | ✓ (100 req/min) | ✓ (300 req/min) |
| AI assistant | – | – | ✓ (500 requests / month default) |

* New workspaces get a **14-day Growth trial, no card** (counted from workspace
  creation unless billing sends `trialEndsAt`).
* Seats = active members (`core.userWorkspace`); invitations count against the
  cap when they are sent. When billing reports purchased `seats`, the cap is
  `min(plan max, purchased seats)`.
* API rate limit = per workspace token bucket on API-key traffic, on top of
  the upstream limit (100 req / 60 s per key).
* AI cap = per workspace per calendar month (`GROWTH_OS_AI_MONTHLY_CAP`, or
  `aiMonthlyCap` in the event).

## Status handling ("pause, don't delete")

| Billing status | Effective plan | After 7-day grace |
|---|---|---|
| `trialing` (before `trialEndsAt`) | Growth | – |
| trial ended, no paid plan | Starter limits | **read-only** |
| `active` | paid plan | – |
| `past_due` | paid plan | **read-only** until paid |
| `canceled` / `unpaid` | Starter limits | **read-only** (or Starter with `GROWTH_OS_UNPAID_ACCESS=starter`) |
| no entitlement row after trial | Starter (safe default) | read-only |

Grace starts at `currentPeriodEnd` (if in the past) or at the status change.
Read-only blocks every record write (GraphQL and REST) and metadata changes;
**reading and CSV export keep working**. Nothing is deleted: paused sync jobs
skip their run, workflows don't run, data and settings stay in place and come
back when the plan is upgraded. Over-limit data (e.g. a 2nd pipeline created
during the trial) stays; only new creations are blocked.

Blocked actions return HTTP 403 / GraphQL `FORBIDDEN` with
`error: GROWTH_OS_PLAN_LIMIT` and a message ending in
"Upgrade in Settings → Plan & Billing."

Enforcement points: invitations + invite accept/sign-up, custom object create,
custom field create, Kanban view create on Opportunities, role create, API key
and webhook create, API-key requests, IMAP/SMTP/CalDAV connect, Google/Microsoft
OAuth connect, messaging/calendar sync jobs, workflow activation and run, AI
chat, and the common record query runner (read-only + API rate limit).

## Providers: `BILLING_PROVIDER=mock | growth-os` (v1)

| | `mock` (default) | `growth-os` |
|---|---|---|
| Purpose | local demo, no service needed | shared **growth-os-billing** service (test mode first) |
| Account | none | `POST /v1/accounts` on workspace activation, `account_id` stored |
| Checkout / portal links | static fallback URLs (or the legacy `/crm/sessions` if `GROWTH_OS_BILLING_URL` is set) | `POST /v1/checkout-sessions`, signed `/portal` link, `POST /v1/portal-sessions` |
| Plan changes | `scripts/growth-os-billing-mock.ts` pushes | signed pushes from the service |
| Seat sync | `/crm/seats` | `POST /v1/seats` |

`growth-os` needs `GROWTH_OS_BILLING_URL` and the module secret; without both, it behaves like `mock`.
The webhook endpoint is the same in both modes.

## Environment variables (CRM)

| Variable | Default | Purpose |
|---|---|---|
| `BILLING_PROVIDER` | `mock` | `mock` or `growth-os` |
| `GROWTH_OS_BILLING_URL` | – | Base URL of the service, e.g. `https://billing.scalepoint-ventures.com` (https required; `http` only for loopback stubs) |
| `GROWTH_OS_BILLING_WEBHOOK_SECRET` (alias `GROWTH_OS_BILLING_SECRET`) | – | The CRM **module secret** (`MODULE_CRM_WEBHOOK_SECRET` in the service). Server env only, never in git, never logged. One secret signs API calls (both ways), pushes and `/portal` links |
| `GROWTH_OS_BILLING_MAILS` | `off` | `off`: the service sends billing mail. `crm`: the CRM sends payment-failed (day 0/3/6) and cancellation mail itself (see Mails). **Set exactly one side to send, never both** |
| `GROWTH_OS_BILLING_SWEEP_SECONDS` | `3600` | Interval of the day-3 / day-6 reminder sweep (only with `GROWTH_OS_BILLING_MAILS=crm`) |
| `GROWTH_OS_CHECKOUT_URL` / `GROWTH_OS_PORTAL_URL` | pricing page / mailto | `mock` fallbacks |
| `GROWTH_OS_UNPAID_ACCESS` | `read_only` | `read_only` or `starter` after cancel/unpaid grace (local clock fallback only) |
| `GROWTH_OS_AI_MONTHLY_CAP` | `500` | Default AI requests / workspace / month on Scale |
| `GROWTH_OS_ENTITLEMENTS_DISABLED` | `false` | `true` disables all gates |
| `SEND_EMAILS` | `false` | Gates every send in the mail driver (true only against the local catcher here) |

## Signup and account creation

Workspace activation (`WorkspaceService.activateWorkspace`) calls `POST /v1/accounts`
`{product:"crm", external_user_id:<workspace uuid>, email, name, locale, trial:true}`:
a **14-day Growth trial without a card**. The call is idempotent in the service (one
account per product + workspace id). The answer `{account_id, organisation_id, version, data}`
is stored in `core."growthOsBillingAccount"`, and `data` is applied as the first entitlement.
It is best effort: signup never fails because billing is down, and the account is
created lazily on the first checkout/portal request (`ensureAccount`).

## Links (checkout, portal, cancel, payment method)

* **Checkout** – `POST /v1/checkout-sessions` `{product, external_user_id, price_lookup_key: crm_<tier>_<m|y>, quantity, success_url: <workspace host>/settings/billing?checkout=success, cancel_url, email, locale}` → `{url, mode}`. `mode=noop` returns the success URL.
* **Manage billing** – only the signed link `GET {billing}/portal?a=<account_id>&m=crm&exp=<now+7d>&sig=<hex>` with `sig = HMAC_SHA256(secret, "portal.crm.<account_id>.<exp>")` (`portal-link.md`; test vector in the unit tests). Built on the server per request; never stored.
* **Cancel** – two steps in the CRM (what happens + reason, then confirm), then `POST /v1/portal-sessions {flow:"cancel", reason}` opens the service's confirmation page. Nothing changes until the service pushes `cancelAtPeriodEnd:true`. "Keep my plan" uses the same call (the service returns its undo page).
* **Payment method** – `POST /v1/portal-sessions {flow:"payment_method"}`.
* Return URLs are limited to `*.scalepoint-ventures.com` (and loopback in test mode); anything else is replaced by `https://crm.scalepoint-ventures.com/settings/billing`.
* All requests: `X-Growth-OS-Signature: t=<unix>,v1=HMAC_SHA256(secret, "<t>.<raw body>")` (a GET signs the empty body), 8 s timeout. If the service fails, checkout/cancel show "Billing is unavailable right now" (no static fallback in `growth-os` mode).
* The UI never names the payment provider.

## Entitlements come from the service state

`POST /webhooks/growth-os-billing` (public; the signature is the auth).

Signature: `X-Growth-OS-Signature: t=<unix>,v1=<hex>` **or** `X-GOS-Timestamp` + `X-GOS-Signature: v1=<hex>`
(the service sends both; either is accepted); `v1 = HMAC_SHA256(secret, "<t>.<raw body>")`, ±300 s.

```json
{
  "id": "evt_gos_<account>_<version>",
  "type": "entitlement.updated",
  "version": 7,                         // pushes with a LOWER version than stored are ignored
  "createdAt": "2026-11-25T17:00:00Z",
  "data": {
    "workspaceId": "<workspace uuid>",
    "plan": "growth",                   // starter | growth | scale
    "status": "active",                 // trialing | active | past_due | canceled (read-only is sent as the underlying status + readOnly:true)
    "seats": 10, "interval": "month",
    "trialEndsAt": null, "currentPeriodEnd": "2026-12-25T17:00:00Z",
    "customerRef": "org_…",
    "readOnly": false,                  // authoritative when present (true OR false)
    "graceUntil": null,                 // service dunning clock, replaces the local 7-day clock
    "cancelAtPeriodEnd": false,         // paid plan stays until currentPeriodEnd
    "lookupKey": "crm_growth_m"
  }
}
```

Responses: `200 {received, result: applied|duplicate|stale, …}`, `401` bad/missing signature,
`400` invalid payload, `404` unknown workspace (not retried by the service). Idempotent by event id.
Ordering: `version` first, `createdAt` for senders without one. Seat caps, features, trial and
read-only come from the stored state: `seatsAllowed = min(plan cap, purchased seats)`; with
`readOnly` present, the local grace clock is not used. Changes apply within ~5 s (per-process cache).

Storage: `core."growthOsPlanEntitlement"` (+ `version, readOnly, graceUntil, cancelAtPeriodEnd, lookupKey`),
`core."growthOsBillingAccount"`, `core."growthOsBillingMailLog"` – all created on boot with
`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, cascade-deleted with the workspace.

## Mails (mail base v3)

The service's contract (`integration/crm.md`) says it sends the billing mails. OS Lead asked for the CRM mails
to be wired to the billing events, so both exist, **switched by `GROWTH_OS_BILLING_MAILS`** (default `off` = no doubles):

| Mail | Trigger (with `crm`) | Dedupe |
|---|---|---|
| Payment failed, day 0 | push moves status to `past_due` | once per grace date |
| Payment failed, day 3 / day 6 | hourly sweep (`GROWTH_OS_BILLING_SWEEP_SECONDS`), the service pushes only on state change | once per day per grace date |
| Cancellation | push with `cancelAtPeriodEnd:true` (or status → `canceled`) | once per period end |
| Invoice | **not sent by the CRM**: invoices belong to the service (PDF + receipt); no CRM template | – |

Mails go through the normal mail driver (`SEND_EMAILS` gate), to the billing contact stored with the account.
Their buttons are the signed `/portal` link. They contain no payment-provider URL.

## Status handling ("pause, don't delete")

| Service state | Effective plan | Read-only |
|---|---|---|
| `trialing` | Growth | after trial end + grace |
| `active` (also with `cancelAtPeriodEnd`) | paid plan until period end | – |
| `past_due` | paid plan | when the service sends `readOnly:true` (after 7 days) |
| `canceled` (period ended) | Starter limits | when the service sends `readOnly:true` (7 days later) |

Read-only blocks every record write and metadata change; **reading and CSV export keep working**.
Nothing is deleted. Blocked actions return `GROWTH_OS_PLAN_LIMIT` ("… Plan & Billing.").
Enforcement points are listed in `PATCHES.md`.

## Local test (no real service)

```bash
# 1) the fake service (implements the documented endpoints, signatures, pushes; no network beyond loopback)
STUB_SECRET=<local test secret> STUB_PUSH_URL=http://127.0.0.1:3000/webhooks/growth-os-billing \
  npx tsx scripts/growth-os-billing-stub.ts
# 2) the CRM
BILLING_PROVIDER=growth-os GROWTH_OS_BILLING_URL=http://127.0.0.1:4010 \
GROWTH_OS_BILLING_WEBHOOK_SECRET=<same local test secret> GROWTH_OS_BILLING_MAILS=crm
# 3) unit tests
cd packages/twenty-server && npx jest --config jest.config.mjs src/engine/core-modules/growth-os/__tests__
```

Stub controls (stand-ins for the payment provider and for time): `POST /__stub/checkout/{id}/pay`,
`POST /__stub/{workspace}/fail-payment | recover | advance {days} | replay-last | push-stale`,
`POST /l/{token}` (cancel confirmation page), `GET /__stub/log`. The legacy mock
(`scripts/growth-os-billing-mock.ts`) still works with `BILLING_PROVIDER=mock`.
Run against the **real** test-mode service: `TEST-CASES-billing.md`.

## Tax (decided 2026-11-25)

* Tax is **automatic** at checkout in the billing service, with tax-ID collection, so business
  customers can enter a VAT ID (reverse charge where valid). All list prices are **net**; copy says
  "VAT is added at checkout". Configured in the service, not in the CRM.

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
| `MODULE_CRM_WEBHOOK_SECRET_FILE` (alias `GROWTH_OS_BILLING_SECRET_FILE`) | – | **Preferred.** Path of a `600` file holding the CRM module secret (`MODULE_CRM_WEBHOOK_SECRET` of the service); handed over at deploy. If set, the file is used; a missing/unreadable/empty file means *no secret* (calls and pushes are rejected, **no fallback to env**). A file readable by group/other logs a warning (path only). Re-read at most every 30 s |
| `MODULE_CRM_WEBHOOK_SECRET` (aliases `GROWTH_OS_BILLING_WEBHOOK_SECRET`, `GROWTH_OS_BILLING_SECRET`) | – | The same secret as an env value, used only when no `*_FILE` is set. One secret signs API calls (both ways), pushes and `/portal` links. Never in git, never logged |
| `GROWTH_OS_CHECKOUT_URL` / `GROWTH_OS_PORTAL_URL` | pricing page / mailto | `mock` fallbacks |
| `GROWTH_OS_UNPAID_ACCESS` | `read_only` | `read_only` or `starter` after cancel/unpaid grace (local clock fallback only) |
| `GROWTH_OS_AI_MONTHLY_CAP` | `500` | Default AI requests / workspace / month on Scale |
| `GROWTH_OS_ENTITLEMENTS_DISABLED` | `false` | `true` disables all gates |
| `SEND_EMAILS` | `false` | Gates every send in the mail driver (true only against the local catcher here) |

## Signup and account creation

Workspace activation (`WorkspaceService.activateWorkspace`) calls `POST /v1/accounts`
`{product:"crm", external_user_id:<workspace uuid>, email, name, locale, trial:true}`:
a **14-day Growth trial without a card**. The call is idempotent in the service (one
account per product + workspace id): a repeat call returns the existing account with **200** (a new one is 201),
updates email/name only if they are sent, and **never restarts the trial** even with `trial:true`. The CRM therefore
treats any 2xx with an `account_id` as success, stores the answer as it is (the trial end is the service's), and calls
the endpoint once per workspace (a known `growthOsBillingAccount` row short-circuits it). The answer `{account_id, organisation_id, version, data}`
is stored in `core."growthOsBillingAccount"`, and `data` is applied as the first entitlement.
It is best effort: signup never fails because billing is down, and the account is
created lazily on the first checkout/portal request (`ensureAccount`).

## Links (checkout, portal, cancel, payment method)

* **Checkout** – `POST /v1/checkout-sessions` `{product, external_user_id, price_lookup_key: crm_<tier>_<m|y>, quantity, success_url: <workspace host>/settings/billing?checkout=success, cancel_url, email, locale}` → `{url, mode}`. The CRM **sends no `mode`**: the service always builds a subscription session and keeps the remaining no-card trial days when more than about 2 days are left. The answer's `mode` is `checkout` (hosted payment page), `confirm` (the service's plan-change confirm page, the org already has a subscription) or `noop` (nothing to pay, `url` is our `success_url`). **The CRM redirects to `url` in all three cases.** `409 interval_conflict` (interval switched inside a combined plan) shows "contact support": EN "The billing interval can’t be changed here … contact support@scalepoint-ventures.com", DE (du) "Das Abrechnungsintervall lässt sich hier nicht ändern … Schreib uns an support@scalepoint-ventures.com" (language of the billing account). Any other error: "Billing is unavailable right now".
* **Manage billing** – only the signed link `GET {billing}/portal?a=<account_id>&m=crm&exp=<now+7d>&sig=<hex>` with `sig = HMAC_SHA256(secret, "portal.crm.<account_id>.<exp>")` (`portal-link.md`; test vector in the unit tests). Built on the server per request; never stored.
* **Cancel** – two steps in the CRM (what happens + reason, then confirm), then `POST /v1/portal-sessions {flow:"cancel", reason}` opens the service's confirmation page. Nothing changes until the service pushes `cancelAtPeriodEnd:true`. "Keep my plan" uses the same call (the service returns its undo page).
* **Payment method** – `POST /v1/portal-sessions {flow:"payment_method"}`.
* Return URLs are limited to `crm.scalepoint-ventures.com` and its workspace subdomains `<workspace>.crm.scalepoint-ventures.com` (loopback only for the local stub); anything else is replaced by `https://crm.scalepoint-ventures.com/settings/billing`. Every checkout call passes `success_url=<workspace host>/settings/billing?checkout=success` (the v1 field name; the legacy `/crm/sessions` calls it `successUrl`) and a `cancel_url` on the same host.
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

**One URL for all workspaces.** The service registers the webhook once, at `https://crm.scalepoint-ventures.com/webhooks/growth-os-billing`. The handler routes each event by `data.workspaceId` (the id the account was created with) and never by the request host, so it works behind any host; a unit test covers two workspaces, mixed hosts and a stale version for one of them.

**Answer codes** (the billing outbox retries non-2xx with backoff 30 s, 2 m, 10 m, 30 m, 1 h, 3 h, 6 h, 12 h, 24 h, 9 attempts, then marks the push dead; **400 and 404 are dead at once**, so they are only used for permanent problems):

| Code | When | Retried by the service |
|---|---|---|
| `200 {received, result}` | `applied`, `duplicate`, `stale` (older version), or `ignored` (an event type this module does not use) | – |
| `503` + `Retry-After` | anything transient: the module secret file is not mounted/readable yet (CRM not ready), the database is down or a query fails, the workspace row or the account is not stored yet (workspace being created) | yes |
| `401` | bad, missing or expired signature (timestamp outside ±300 s) | yes (it is not 400/404; a rotated secret recovers by itself) |
| `400` | not JSON, or permanently invalid payload (unknown plan/status, no valid `workspaceId`) | no (dead) |
| `404` | the `workspaceId` is valid but no such workspace exists (deleted, or never existed) | no (dead) |

A push for a workspace that is still being created is therefore answered `503`, never `404`: the workspace row is written before the billing account is created, so a real push cannot arrive earlier; if it ever did, it retries. Idempotent by event id.
Ordering: `version` first, `createdAt` for senders without one. Seat caps, features, trial and
read-only come from the stored state: `seatsAllowed = min(plan cap, purchased seats)`; with
`readOnly` present, the local grace clock is not used. Changes apply within ~5 s (per-process cache).

**Reconcile (pushes are the main channel, this is the safety net).** When the plan page is read (`growthOsPlan`) and the stored state is older than 10 minutes (the later of the last applied push and the last reconcile, `syncedAt`), the CRM calls `GET /v1/entitlements?product=crm&external_user_id=<workspaceId>` once, in the background, and applies the answer through the same version ordering as a push (an older answer never overwrites a newer push). At most one such call per workspace per 10 minutes (in memory per server process); a check that finds the state fresh does not use up the window; mock mode and a failing service change nothing and never fail the page.

**Owner email / name changes.** The billing service sends all billing mail to the account email, so it follows the workspace: when the owner's email changes (verified email change), the workspace name changes, or the plan page finds the stored email/name different from the current ones (retry after a failure, name changes), the CRM calls `POST /v1/accounts` again (idempotent: the account is updated, no second trial, no second `trial_started` mail; no `trial` flag is sent). Nothing is sent when nothing changed.

**TLS ask endpoint.** `GET /internal/tls-ask?domain=<host>` answers `200` only for the host in `FRONTEND_URL` and `<subdomain>.<that host>` of an existing, not deleted workspace; everything else `404`, database trouble `503`. It refuses requests that carry `X-Forwarded-For`/`X-Forwarded-Host` (anything that came through the public proxy). See `CUTOVER-PLAN.md` for the Caddy side.

Storage: `core."growthOsPlanEntitlement"` (+ `version, readOnly, graceUntil, cancelAtPeriodEnd, lookupKey, syncedAt`),
`core."growthOsBillingAccount"` – created on boot with
`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, cascade-deleted with the workspace.

## Mails: the billing service sends all of them

The CRM sends **no billing mail**: payment failed (day 0/3/6), cancellation, invoice and receipt mail all come
from growth-os-billing (decided 27 Nov). There is no mail code, no sender dependency and no mail sweep in the CRM
billing path (a unit test guards this). The mail templates in `twenty-emails` (payment failed, cancellation, …) stay
for previews and the mail base only. The former `GROWTH_OS_BILLING_MAILS=crm` option and its hourly sweep were removed.

Read-only is **not** flipped by a job: it is derived when entitlements are read, from the service's `readOnly` /
`graceUntil` fields (local 7-day clock only for senders that omit them). Nothing runs in the background.

## Status handling ("pause, don't delete")

| Service state | Effective plan | Read-only |
|---|---|---|
| `trialing` (no card) | Growth | after trial end + grace |
| `trialing` + `lookupKey` (plan bought with more than 2 days + 1 h of trial left; with less the service sets no trial end and pushes `active` at once) | the bought plan, **bought seats apply**, still shown as a trial ("billing starts <trial end>") | – (the service pushes `active` at the first payment) |
| `trialing` with `trialEndsAt` in the past (expired card-free trial, `graceUntil` set) | **Starter limits, shown as "Trial ended", never as a trial**; the service's `graceUntil` is the grace end | when `readOnly:true`, or (fail closed) once `graceUntil` has passed; the service then pushes `canceled` + `readOnly:true` |
| `active` (also with `cancelAtPeriodEnd`) | paid plan until period end | – |
| `past_due` | paid plan | when the service sends `readOnly:true` (after 7 days) |
| `canceled` (period ended) | Starter limits | when the service sends `readOnly:true` (7 days later) |

Read-only blocks every record write and metadata change; **reading and CSV export keep working**.
Nothing is deleted. Blocked actions return `GROWTH_OS_PLAN_LIMIT` ("… Plan & Billing.").
Enforcement points: invitations and invite accept, custom objects and fields, Kanban views on Opportunities, roles, API keys and webhooks, API-key requests, IMAP/Google/Microsoft connect, sync jobs, workflow activation and run, AI chat, and the record query runner (read-only + API rate limit). Over-limit data stays; only new creations are blocked.

## Local test (no real service)

```bash
# 1) the fake service (implements the documented endpoints, signatures, pushes; no network beyond loopback)
STUB_SECRET=<local test secret> STUB_PUSH_URL=http://127.0.0.1:3000/webhooks/growth-os-billing \
  npx tsx scripts/growth-os-billing-stub.ts
# 2) the CRM
BILLING_PROVIDER=growth-os GROWTH_OS_BILLING_URL=http://127.0.0.1:4010 \
MODULE_CRM_WEBHOOK_SECRET_FILE=<600 file with the same local test secret>
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

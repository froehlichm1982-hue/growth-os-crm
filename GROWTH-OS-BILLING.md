# Growth OS CRM — plans, entitlements and the billing hook

This fork enforces Growth OS CRM plans **inside the CRM** (AGPL side) and
receives plan changes from the separate, closed **growth-os-billing** service
over a signed webhook. The CRM contains **no Stripe SDK, no Stripe keys and no
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
| Stripe lookup keys (billing service) | `crm_starter_m` / `crm_starter_y` | `crm_growth_m` / `crm_growth_y` | `crm_scale_m` / `crm_scale_y` |
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

## Environment variables (CRM)

| Variable | Default | Purpose |
|---|---|---|
| `GROWTH_OS_BILLING_WEBHOOK_SECRET` | – (webhook rejects everything) | HMAC secret shared with growth-os-billing |
| `GROWTH_OS_BILLING_URL` | – | Base URL of growth-os-billing (`/crm/sessions`, `/crm/seats`). Unset → static checkout URL fallback |
| `GROWTH_OS_CHECKOUT_URL` | `https://scalepoint-ventures.com/growthos/crm#pricing` | Placeholder checkout/pricing URL (gets `product`, `workspace`, `lookup_key`, `seats` params) |
| `GROWTH_OS_PORTAL_URL` | `mailto:support@scalepoint-ventures.com` | "Manage billing" fallback |
| `GROWTH_OS_UNPAID_ACCESS` | `read_only` | `read_only` or `starter` after cancel/unpaid grace |
| `GROWTH_OS_AI_MONTHLY_CAP` | `500` | Default AI requests / workspace / month on Scale |
| `GROWTH_OS_ENTITLEMENTS_DISABLED` | `false` | `true` disables all gates (self-host / emergency) |

Never commit real values. The CRM never needs a Stripe key.

## Webhook contract

`POST /webhooks/growth-os-billing` (public, no auth header other than the signature)

Header: `X-Growth-OS-Signature: t=<unix seconds>,v1=<hex>` where
`v1 = HMAC_SHA256(secret, "<t>.<raw request body>")`. Timestamps older or
newer than 300 s are rejected (replay protection).

```json
{
  "id": "evt_01J…",                     // unique, used for idempotency
  "type": "entitlement.updated",
  "createdAt": "2026-11-25T17:00:00Z",   // ordering; older events are ignored
  "data": {
    "workspaceId": "0b5c…-uuid",
    "plan": "growth",                    // starter | growth | scale
    "status": "active",                  // trialing | active | past_due | canceled | unpaid
    "seats": 10,                         // purchased seats, or null
    "interval": "month",                 // month | year | null
    "trialEndsAt": null,                 // ISO, optional
    "currentPeriodEnd": "2026-12-25T17:00:00Z",
    "customerRef": "cus_…",              // opaque, stored for support only
    "features": { "ai": true },          // optional per-feature overrides (paid states only)
    "aiMonthlyCap": 1000                 // optional
  }
}
```

Responses: `200 {received, result: applied|duplicate|stale, workspaceId,
effectivePlan, status, seatsAllowed, isReadOnly}`, `401` bad/missing
signature, `400` invalid payload, `404` unknown workspace. The billing service
should retry non-2xx (except 400/404) with backoff. Changes apply within ~5 s
(per-process cache) — no restart.

Storage: `core."growthOsPlanEntitlement"` (one row per workspace, created on
boot with `CREATE TABLE IF NOT EXISTS`, cascade-deleted with the workspace).

## Calls from the CRM to growth-os-billing (expected API)

Both signed with the same header scheme, 5 s timeout, best effort:

* `POST {GROWTH_OS_BILLING_URL}/crm/sessions` `{kind: checkout|portal, workspaceId, plan, interval, lookupKey, seats, returnUrl}` → `{url}` (Stripe Checkout / Customer Portal session created by billing).
* `POST {GROWTH_OS_BILLING_URL}/crm/seats` `{workspaceId, seatsUsed}` after a member joins.

## Local test

```bash
export GROWTH_OS_BILLING_WEBHOOK_SECRET=<same as the server>
npx tsx scripts/growth-os-billing-mock.ts subscribe --workspace <uuid> --plan starter
npx tsx scripts/growth-os-billing-mock.ts upgrade   --workspace <uuid> --plan growth --seats 10
npx tsx scripts/growth-os-billing-mock.ts cancel    --workspace <uuid> --period-end 2026-01-01T00:00:00Z
npx tsx scripts/growth-os-billing-mock.ts trial     --workspace <uuid> --trial-ends 2026-01-01T00:00:00Z
npx tsx scripts/growth-os-billing-mock.ts upgrade   --workspace <uuid> --bad-signature   # → 401
```

The mock never talks to Stripe.

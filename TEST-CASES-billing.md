# TEST-CASES-billing: CRM against the real test-mode growth-os-billing

For OS Lead. Run on the server, with the CRM module secret from `/opt/growth-os-billing/.env`
(`MODULE_CRM_WEBHOOK_SECRET`). Test mode only: Stripe test cards, no real money. The same cases
ran green against the local stub (`quality-gate/tools/e2e-billing.mjs`); these steps confirm the real service behaves the same.

## 0. Setup

CRM environment (server only, never in git):

```
BILLING_PROVIDER=growth-os
GROWTH_OS_BILLING_URL=https://billing.scalepoint-ventures.com
MODULE_CRM_WEBHOOK_SECRET_FILE=/path/to/crm-module-secret   # the 600 file handed over at deploy (or MODULE_CRM_WEBHOOK_SECRET=<value>)
```

The CRM sends **no billing mail** (the service sends payment-failed, reminders, cancellation, invoice, receipt), so no mail
setting is needed for these cases. `SEND_EMAILS` only matters for the CRM's own auth mails.

Service side: the CRM return hosts allow `crm.scalepoint-ventures.com` and `*.crm.scalepoint-ventures.com`; the CRM webhook is registered
**once** at `https://crm.scalepoint-ventures.com/webhooks/growth-os-billing` (all workspaces).
Use a test workspace. `W` = its id (Settings → or `select id from core.workspace`), `ACC` = its account id.
Helper: `sig() { t=$(date +%s); printf 't=%s,v1=%s' "$t" "$(printf '%s.%s' "$t" "$1" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')"; }`

| # | Steps | Expected |
|---|---|---|
| T1 | `curl https://billing.scalepoint-ventures.com/healthz` | `{"ok":true,"livemode":false,…}` (livemode **false**) |
| T2 Signup creates the account | Sign up in the CRM with a new email and create the workspace. Then `curl -s -H "X-Growth-OS-Signature: $(sig '')" "$BILLING/v1/entitlements?product=crm&external_user_id=$W"` | 200. `status` trialing, `plan` growth, `trial_ends_at` ≈ +14 days, no card asked. DB: `select "accountId" from core."growthOsBillingAccount" where "workspaceId"='W'` has a row (= `account_id`) |
| T3 Trial in the CRM | Settings → Plan & Billing | "Growth trial · 14 days left"; seats allowed 25; nothing is read-only |
| T4 Checkout link | Click "Upgrade to Growth" (monthly) | New tab on the service's hosted checkout (no CRM-side URL). Billing logs show `POST /v1/checkout-sessions` with `price_lookup_key=crm_growth_m`. Net price per user, tax line and VAT-ID field appear |
| T5 Webhook activates the plan | Pay with `4242 4242 4242 4242`. Return to the CRM (`/settings/billing?checkout=success`) | Note "We are activating your plan…", then "Your plan is active." within ~10 s. Plan page: Growth, active, period end ≈ +1 month. Service delivery log: push `200 applied` |
| T6 Seat cap | Seats purchased = 1 (check plan page). Invite 1 person | Blocked: "Your Growth plan includes 1 seat…". After "Update seats" to 2 via Manage billing (or `POST /v1/seats {seats:2}`), the invite works |
| T7 Signed portal link | Click "Manage billing". Copy the URL | Opens `https://billing.scalepoint-ventures.com/portal?a=ACC&m=crm&exp=<≈now+7d>&sig=<64 hex>` → 302/200 to the hosted portal. Recompute: `printf 'portal.crm.ACC.<exp>' \| openssl dgst -sha256 -hmac "$SECRET"` = `sig`. Change one hex char → 400 page; set `exp` to the past with its valid sig → 410 "expired" page (the service mails a fresh link at most once an hour). No secret in the URL |
| T8 Push ordering | Redeliver an older event from the service delivery log (lower `version`) | CRM answers `200 {"result":"stale"}`, plan unchanged. Resending the same event id → `duplicate` |
| T9 Signature checks | `curl -X POST $CRM/webhooks/growth-os-billing -d '{}'` (no header) → 401. Valid body with `t` 400 s old → 401. Wrong secret → 401. Real service delivery (it sends both header styles) → 200 | as listed |
| T10 Payment failed | Stripe test clock / card `4000 0000 0000 0341` on renewal (or the service's test-clock helper) | Push → CRM shows "Payment failed · fix by <date>", still writable. Banner "Update payment method" opens the signed portal link. The **service** sends the day-0 mail (see M); the CRM sends none |
| T11 Read-only after grace | Advance the test clock 7 days | Push with `readOnly:true`: plan page "read-only"; creating a record → "This workspace is read-only…"; list views and CSV export still work; nothing deleted |
| T12 Recovery | Update the card in the portal; invoice pays | Push `active`, `readOnly:false`; writes work again |
| T13 Cancel (2 steps) | Plan page → "Cancel plan" → step 1 (what happens, optional reason) → Continue → step 2 → "Cancel plan" | New tab with the service's cancel confirmation page. Until you confirm there: no change. Confirm: push `cancelAtPeriodEnd:true`; CRM shows the scheduled cancellation with "Keep my plan"; plan stays Growth, active |
| T14 Undo | Click "Keep my plan" | Service's undo page; confirm → push `cancelAtPeriodEnd:false` |
| T15 Period end | Cancel again, advance the test clock past the period end | Push `canceled` (Starter limits, still writable 7 days), then `readOnly:true` after 7 days |
| T16 Failure handling | Temporarily set a wrong secret in the CRM, click "Upgrade" | "Billing is unavailable right now…" (service answers 401); signup still works; fix the secret → account is created lazily on the next click |
| T17 Return URL | In the browser console call the GraphQL mutation `growthOsBillingSessionUrl(kind:"checkout", plan:"growth", returnUrl:"https://evil.example")` | URL still works; the service log shows `success_url` = `<workspace host>/settings/billing?checkout=success` and `cancel_url` on `crm.scalepoint-ventures.com` / `*.crm.scalepoint-ventures.com` only (the evil host never reaches the service) |
| T18 Mock fallback | Unset `BILLING_PROVIDER` (or `mock`) and restart | Demo behaves as before: static links, `scripts/growth-os-billing-mock.ts` pushes work |
| T19 Secret file | Remove `MODULE_CRM_WEBHOOK_SECRET` from the CRM env, keep `MODULE_CRM_WEBHOOK_SECRET_FILE`, restart. Then point the file at a missing path and restart | With the file: T2, T7 and T9 work. With a missing/empty file: the webhook answers 401 and signup still works (no env fallback). The server log shows a warning only if the file mode is looser than 600; never the secret |
| T20 One webhook URL, two workspaces | Create a second test workspace (other subdomain). Pay for Growth in the first, let a payment fail in the second | Both pushes arrive at `https://crm.scalepoint-ventures.com/webhooks/growth-os-billing`; the first shows active, the second past_due, each only on its own workspace |

## M. Mails (sent by the service, none by the CRM)

| # | Steps | Expected |
|---|---|---|
| M1 | Repeat T10 (payment failed) | The service sends "payment failed" to the billing contact; its button is the signed `/portal` link; **no mail from the CRM** (check the CRM mail log / `noreply` sender: nothing for this event) |
| M2 | Wait or advance the clock 3 and 6 days | The service sends the day-3 and day-6 reminders, one each. The CRM sends nothing and runs no background job |
| M3 | Repeat T13 (cancel) | The service sends the cancellation mail once; the CRM sends none |
| M4 | Pay an invoice / renewal | The service sends the invoice and receipt mails; the CRM sends none |
| M5 | Check sender and links in the service mails | Links only `crm.scalepoint-ventures.com`, the workspace host or the service host; no payment-provider URL |

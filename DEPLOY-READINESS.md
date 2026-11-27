# DEPLOY-READINESS: Growth OS CRM, release candidate 1

One release package. OS Lead executes it; Markus gives the GO. Nothing here has been pushed, deployed or sent.
Prepared 27 Nov 2026, Europe/Berlin. Never touch `/opt/spv-crm`: this package uses its own directory, compose project, network, volumes and port.

## 1. What is released

`release-candidate-1` (local branch) = `ds-v2-pr1` (PR #2, head `bd727e77a7d`, which already contains `ds-v2`) + `billing-v1` + the deploy package.

| Branch | Head | Content |
|---|---|---|
| `main` | `9f755443d84` | base |
| `ds-v2` | `0dc72e1720b` | PR #1: 43 commits on main (DS v2, mail base v3, optional 2FA, a11y) |
| `ds-v2-pr1` | `bd727e77a7d` | PR #2: ds-v2 plus 19 commits (DS v2.9 auth/status screens, 30-minute verify link, scoped CSS, 2FA reset runbook). **Nothing in `ds-v2` is missing from it** (the merge `489fce0963a` took ds-v2 in) |
| `billing-v1` | `936eb98a9da` | 16 commits on `ds-v2`: growth-os-billing provider, accounts, checkout (checkout/confirm/noop, 409), signed portal links, trial facts, expired trial, self-healing account creation, telemetry default off. No overlap with PR #2 except the translation files |
| `release-candidate-1` | see §9 | `ds-v2-pr1` + `billing-v1` merged (translation conflicts resolved: PR #2 side taken, then `lingui extract` + `compile` re-run) + `deploy/` + this file |

**Release order:** PR #1 → PR #2 → billing. PR #2 contains PR #1, so merging #2 makes #1 empty; merge #1 first anyway to keep the history readable. The billing change is then one PR from `release-candidate-1`, whose diff against `main` is only billing + hardening + deploy, with the translation conflicts already resolved. If you prefer a single step: merge only the RC as one PR (it carries everything).

## 2. Production environment

Two files in `deploy/` (copy the examples, never commit the filled ones): `crm.env` (settings, no secrets) and `crm.secrets.env` (600). The module secret is a third file. `./preflight.sh` checks all of this.

| Variable | Value / source | Why |
|---|---|---|
| `BILLING_PROVIDER` | `growth-os` | anything else runs the local mock |
| `GROWTH_OS_BILLING_URL` | `https://billing.scalepoint-ventures.com` (must be https) | billing service base URL |
| `MODULE_CRM_WEBHOOK_SECRET_FILE` | `/run/secrets/module_crm_webhook_secret` in the container; on the host a **600 file, owner uid 1000**, handed over by OS Lead (`MODULE_CRM_WEBHOOK_SECRET_HOST_FILE`) | signs API calls, pushes and portal links. Do **not** also set `MODULE_CRM_WEBHOOK_SECRET`. A missing or empty file means no secret: the CRM then rejects pushes (fail closed) |
| `TELEMETRY_ENABLED` | `false` (explicit; the code default is now false too) | the upstream telemetry host is never called |
| `ANALYTICS_ENABLED` | `false` | no tracking |
| `SENTRY_DSN`, `SENTRY_FRONT_DSN`, `SENTRY_ENVIRONMENT`, `CLICKHOUSE_URL` | unset | Sentry and analytics off |
| `EXCEPTION_HANDLER_DRIVER`, `SUPPORT_DRIVER` | `console`, `none` | |
| AI keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `AI_PROVIDERS` | unset | AI off |
| `ENTERPRISE_KEY`, `ENTERPRISE_VALIDITY_TOKEN` | unset | no upstream licence |
| `ALLOW_REQUESTS_TO_TWENTY_ICONS` | `false` | no third-party logo lookups |
| `AUTH_GOOGLE_ENABLED`, `AUTH_MICROSOFT_ENABLED` | `false` until real OAuth client ids exist | no dead buttons |
| `SEND_EMAILS` | `false` until Markus' GO; then `true` via `./deploy.sh --go-live` | the mail driver sends nothing unless exactly `true` |
| `EMAIL_DRIVER` / `EMAIL_SMTP_HOST` / `EMAIL_SMTP_PORT` / `EMAIL_SMTP_USER` | `smtp` / `smtp.resend.com` / `465` (implicit TLS) or `587` / `resend` | Resend over SMTP: verification and reset mails only (billing mails come from the billing service) |
| `EMAIL_SMTP_PASSWORD` | the Resend key, in `crm.secrets.env` | leave `RESEND_API_KEY` **unset** (it would also switch on the BCC inbox's Resend inbound path) |
| `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO` | `noreply@scalepoint-ventures.com`, `ScalePoint Growth OS CRM`, `support@scalepoint-ventures.com` | |
| `IS_EMAIL_VERIFICATION_REQUIRED` | `true` | |
| `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN` | `30m` | verify link lifetime (reset stays 60 min) |
| `SERVER_URL`, `FRONTEND_URL` | `https://crm.scalepoint-ventures.com` | |
| `IS_MULTIWORKSPACE_ENABLED` | `true` | one workspace per customer on `<slug>.crm.scalepoint-ventures.com` |
| `DEFAULT_SUBDOMAIN` | empty | the bare domain is the entry |
| `IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS`, `MAX_WORKSPACES`, `SIGN_IN_PREFILLED`, `IS_BILLING_ENABLED` | `false`, `0`, `false`, `false` | self-service signup, no cap, upstream billing off |
| `SOURCE_CODE_URL` | the public repository URL | AGPL-3.0 section 13 source offer; required at GO (`./preflight.sh --go` warns/fails) |
| `HELP_URL` | `https://scalepoint-ventures.com/growthos/crm/faq` | |
| `APP_SECRET`, `ENCRYPTION_KEY`, `CRM_DB_PASSWORD` | generated (`openssl rand -base64 32`), in `crm.secrets.env` | |
| `CRM_HTTP_PORT` | `3110` | loopback port of the server; the reverse proxy forwards to `127.0.0.1:3110` |

The webhook is registered **once** in the billing service at `https://crm.scalepoint-ventures.com/webhooks/growth-os-billing`; events are routed by workspace id, never by host.

## 3. The stack (`deploy/`)

| File | Purpose |
|---|---|
| `docker-compose.yml` | project `growth-os-crm`: `server`, `worker`, `db` (postgres 16), `redis` 7; own network `growth-os-crm_net`; volumes `crm-db`, `crm-redis`, `crm-local-data`; only port `127.0.0.1:3110->3000`; image built from `packages/twenty-docker/twenty/Dockerfile` (target `twenty`, server + front); the module secret is a compose file-secret |
| `env.production.example`, `secrets.env.example` | the lists above, names and non-secret values only |
| `preflight.sh` | fails (exit 1) if `TELEMETRY_ENABLED` is not exactly `false`, the module secret file or `crm.secrets.env` is not mode 600 or is empty, `SEND_EMAILS` is `true` before GO (or not `true` with `--go`), a Sentry/AI/enterprise/`RESEND_API_KEY` value is set, the provider is not `growth-os`, the billing URL is not https, verification or the 30m link is off, the port is taken, or the stack mentions `/opt/spv-crm` |
| `deploy.sh` | **dry run by default**. `--apply` (pre-flight, build, backup if a DB exists, db/redis, server with migrations and cron registration, worker, health wait), `--go-live` (SEND_EMAILS=true, GO pre-flight, recreate server+worker, smoke), `--rollback` |
| `smoke.sh` | automatic checks: health, front, no upstream branding, unsigned/bad-signature webhook 401, config flags, wildcard TLS, http→https, billing health |
| `backup.sh` | `pg_dump` with 14-day rotation (cron line inside) |

Needs on the server: Docker with the compose v2 plugin (it is not installed on the box I worked on, so the compose file was only read, not started), about 8 GB free during the image build, a reverse proxy.

Reverse proxy (OS Lead's existing proxy, a new vhost only): `crm.scalepoint-ventures.com` and `*.crm.scalepoint-ventures.com` → `http://127.0.0.1:3110`, forward `Host`, `X-Forwarded-Proto`, `X-Forwarded-For`, websockets on, redirect http→https. The wildcard needs a wildcard certificate (DNS-01 challenge).

## 4. Tested on the release candidate

| Check | Result |
|---|---|
| Typecheck server + front (tsgo) | pass |
| `vite build` front, `check-white-label`, `strip-enterprise --check`, `check-permission-hot-path` | pass |
| Server build (nest/swc) | pass |
| Unit tests (growth-os suite, 10 files) | **108/108** |
| Stub E2E (billing against the local fake service; 51 steps: signup → account → trial → checkout modes → seats → portal → ordering → dunning without CRM mail → cancel → read-only → reactivation → expired trial → late purchase → no CRM welcome mail) | **51/51** |
| Mock suite (entitlements, BCC, export; `BILLING_PROVIDER=mock`) | **47/47** |
| Real billing service (T1-T26 in `TEST-CASES-billing.md`) | **not run** (after the Stripe step) |
| Human test script | `human-tests/crm.md` (CRM-01 to CRM-68), for Markus after GO |

## 5. GO day: order, owners, commands

Before GO nothing sends mail (`SEND_EMAILS=false`), so signup cannot be verified: the checks before GO cover health, auth of the webhook and the link to the billing service; the journey tests start right after the flip.

| # | Step | Who | Command / detail |
|---|---|---|---|
| 0 | **Merge** PR #1, then PR #2, then the billing PR (or the RC as one PR); see §7 | Markus approves, OS Lead merges (nobody has pushed anything yet) | |
| 1 | DNS: `crm` and `*.crm` A/AAAA (or CNAME) → the server; low TTL a day before | Markus (registrar) or OS Lead | `dig +short crm.scalepoint-ventures.com` and `dig +short x.crm.scalepoint-ventures.com` |
| 2 | Wildcard TLS certificate for `crm.scalepoint-ventures.com` + `*.crm.scalepoint-ventures.com` | OS Lead | DNS-01 |
| 3 | Resend: domain `scalepoint-ventures.com` verified (SPF, DKIM, DMARC), API key created | Markus | key goes to OS Lead over the vault, not chat |
| 4 | Public source repository exists; URL for `SOURCE_CODE_URL` | Markus | AGPL section 13 |
| 5 | Billing service ready: `crm` product with lookup keys `crm_{starter,growth,scale}_{m,y}`, webhook registered once, return hosts `crm.scalepoint-ventures.com` and `*.crm.scalepoint-ventures.com`, the `trial_started`, payment-failed, reminder, cancellation, invoice and receipt mails on, Stripe step done | OS Lead (Stripe step: Markus) | `curl https://billing.scalepoint-ventures.com/healthz` |
| 6 | Create `/opt/growth-os-crm/` (own directory), clone the release at the RC head, `cd deploy` | OS Lead | not under `/opt/spv-crm` |
| 7 | Secret file: the CRM module secret into `/opt/growth-os-crm/secrets/module_crm_webhook_secret` | OS Lead | `chmod 600`, `chown 1000:1000` |
| 8 | `cp env.production.example crm.env`, `cp secrets.env.example crm.secrets.env` (`chmod 600`), fill in; set `MODULE_CRM_WEBHOOK_SECRET_HOST_FILE` | OS Lead | |
| 9 | `./preflight.sh` | OS Lead | must print `0 FAIL` |
| 10 | `./deploy.sh` (dry run), read it, then `./deploy.sh --apply` | OS Lead | image build, migrations and cron registration happen on first start |
| 11 | Reverse proxy vhost → `127.0.0.1:3110` | OS Lead | |
| 12 | `./smoke.sh` | OS Lead | must print `0 FAIL` |
| 13 | **GO** | **Markus** | |
| 14 | `./deploy.sh --go-live` (SEND_EMAILS=true, GO pre-flight, recreate, smoke) | OS Lead | the pre-GO env is kept as `crm.env.pre-go.<time>` |
| 15 | Journey test `human-tests/crm.md` with the test-clock helper | Markus + OS Lead | |
| 16 | `./backup.sh` once, then the cron line | OS Lead | |

## 6. Rollback

1. Stop the mail first if needed: `cp crm.env.pre-go.<time> crm.env` (it has `SEND_EMAILS=false`), then recreate with `docker compose -p growth-os-crm --env-file crm.env --env-file crm.secrets.env up -d --force-recreate server worker`.
2. `./deploy.sh --rollback` stops `server` and `worker` of this project only. Volumes are kept, nothing is deleted.
3. Point the reverse proxy / DNS back to what served the old CRM (OS Lead). The old stack under `/opt/spv-crm` was never touched and still runs as before.
4. The billing service keeps its webhook registration; while the CRM is down it cannot deliver pushes (OS Lead: confirm the service retries and replays on recovery). Workspace state in the CRM catches up with the next push per workspace.
5. A bad migration: restore the dump taken by `./deploy.sh --apply` or `./backup.sh`: stop server+worker, `docker compose -p growth-os-crm ... exec -T db pg_restore -U crm -d crm --clean --if-exists < backups/crm-<time>.dump`, start the previous image tag (`GROWTH_OS_CRM_IMAGE=growth-os-crm:<previous>`).

## 7. Pushes and PRs needed (a separate step; none done)

Nothing leaves the box without Markus' OK. When he agrees:

1. `git push origin ds-v2` and open/refresh PR #1 (`ds-v2` → `main`). Check which remote is `origin`: this clone only has `upstream` (twenty).
2. `git push origin ds-v2-pr1` (PR #2, head `bd727e77a7d`).
3. `git push origin billing-v1 release-candidate-1`, then a draft PR `release-candidate-1` → `main` with the note in `/workspace/push-handoff/PR-rc1-billing-note.md`.
4. Offline alternatives in `/workspace/push-handoff/`: `gos-crm-rc1.bundle` (increment: `billing-v1` and `release-candidate-1` on top of `ds-v2-pr1`, needs that history already present) and `gos-crm-rc1-full.bundle` (everything above `main`). On the server: `git clone gos-crm-rc1-full.bundle crm && cd crm && git checkout release-candidate-1`.

## 8. Journey walk: gaps (code and local stub)

Journey: signup → email verification → workspace → trial → welcome mail (billing) → access → checkout → dunning → read-only → reactivation → cancellation + export.

| Step | Status |
|---|---|
| Verification and reset mails by the CRM via Resend SMTP, behind `SEND_EMAILS` | works; the real Resend domain is untested (needs the Markus step above) |
| No CRM welcome / trial / billing mail | confirmed in code (no sender exists, unit test) and on the stub E2E (no such mail reaches the user) |
| Billing account created at workspace creation | automatic; if the service is down at that moment, the account is created when the plan page is next read (new, throttled) |
| Trial, welcome mail | trial from the service's push; `trial_started` is sent by billing at account creation |
| Checkout → plan, dunning, read-only | works on the stub, driven only by pushes (`readOnly`, `graceUntil`) |
| Reactivation from read-only or an expired trial | works on the stub: checkout while read-only, the push lifts read-only |
| Cancellation (2 steps) and CSV export in read-only | works (export covered by the mock suite) |
| Onboarding | no operator action anywhere: no approval step, no manual plan step; sample data is optional |
| Telemetry | **was on by default** (`TELEMETRY_ENABLED = true` calls the upstream host); default changed to false, pre-flight requires an explicit `false` |
| Workspace cleaner (suspended workspaces, with its own mails) | cannot trigger: workspaces only become suspended through the upstream billing webhook, which is off |
| Subdomains / DNS / TLS | only tested on `localhost`: needs the wildcard DNS, wildcard certificate and proxy of §5 and `smoke.sh` |
| Unused leftovers | the `billing-*.email.tsx` templates in `twenty-emails` are not referenced by the server any more (only by a rendering test); harmless, can be deleted later |

## 9. Heads (fill after the last commit)

RC head: `git rev-parse release-candidate-1` (the commit "release-candidate-1: deploy readiness") · billing-v1: `936eb98a9da` · ds-v2-pr1: `bd727e77a7d` · ds-v2: `0dc72e1720b`.

## 10. Still missing

**Needs Markus**
- GO (step 13) and the Stripe step (billing service live mode).
- Resend: verify the sending domain and create the key.
- DNS records (if he controls the registrar) for `crm` and `*.crm`.
- The public source repository URL (`SOURCE_CODE_URL`, AGPL).
- OK to push (§7), to merge PR #1, #2 and the billing PR, and to run the human test.

**Needs OS Lead**
- The server: docker compose v2, `/opt/growth-os-crm/`, reverse proxy vhost, wildcard certificate, free port for `CRM_HTTP_PORT`.
- The module secret as a 600 file (owner uid 1000), `crm.secrets.env`.
- Billing service: webhook registered once, return hosts, lookup keys, mail templates (`trial_started`, payment failed, reminders, cancellation, invoice, receipt), retry/replay of undelivered pushes, test-clock helper for `human-tests/crm.md`.
- Real runs of `TEST-CASES-billing.md` T1-T26 against the real test-mode service.
- Backup cron and monitoring/alerting (health, disk, mail bounces).

**Needs me (Grok Bot), once the above is decided**
- Reconcile job: today the CRM trusts pushes only. If a push is lost, the state stays stale until the next one. Proposal: `GET /v1/entitlements` refresh when the plan page is read and the stored state is older than a threshold. Not built: needs OS Lead's OK on the endpoint load.
- Sync of an owner email change to the billing account (today: the signup address).
- Run the compose stack once on a machine with docker compose (the box here has none).
- Delete the unused `billing-*` mail templates if wanted.

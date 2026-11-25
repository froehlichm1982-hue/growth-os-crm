# Growth OS CRM

Growth OS CRM is the CRM module of **ScalePoint Growth OS**, a self-service,
multi-tenant CRM for small and mid-sized B2B teams, operated by ScalePoint
Ventures Oy.

Growth OS CRM is **a fork of [Twenty](https://github.com/twentyhq/twenty)**, the
open-source CRM. It is not affiliated with or endorsed by Twenty.com PBC.
"Twenty" is a trademark of its owner and is used here only to describe the
origin of the code.

## Status

Pre-production. Build step 1 (fork + Enterprise strip + CI) is done. See
[`ENTERPRISE-STRIP.md`](./ENTERPRISE-STRIP.md) for what was removed and the
known runtime gaps that later build steps close.

## Upstream

| | |
| --- | --- |
| Upstream repository | https://github.com/twentyhq/twenty |
| Base release | `twenty/v2.40.2` (2026-09-15) |
| Git remote name | `upstream` |

```bash
git remote add upstream https://github.com/twentyhq/twenty.git
git fetch --no-tags upstream '+refs/tags/twenty/v*:refs/tags/twenty/v*'
```

Upstream releases are merged by tag, never by branch. After every merge, run
the Enterprise strip again (see below). The `Upstream sync check` workflow
tests the newest release nightly and reports problems without pushing.

**Why v2.40.2, and the upgrade ceiling.** Starting with v2.41, upstream Twenty
moves permission checks that the data layer runs on every request into
Enterprise-licensed files: first record sharing and object-readability
gating, then (v2.55 to v2.58: #29787, #29824, #30007) the core record-permission
services. v2.40.x is the newest line where only row-level-permission (RLS)
helpers are Enterprise, and those have a safe "feature off" replacement.
**Upgrading past v2.40.x requires our own AGPL permission layer.**
`scripts/check-permission-hot-path.ts` enforces this in CI, and the sync
workflow reports such releases as blocked instead of merging them.

## Deployment settings (Growth OS CRM)

| Variable | Default | Notes |
|---|---|---|
| `FRONTEND_URL` / `SERVER_URL` | – | `https://crm.scalepoint-ventures.com`; workspaces live on `<workspace>.crm.scalepoint-ventures.com` (wildcard DNS + TLS) |
| `DEFAULT_SUBDOMAIN` | *(empty)* | Empty = the bare domain is the sign-in/sign-up entry (no `app.` prefix). `app` stays reserved |
| `HELP_URL` | `https://scalepoint-ventures.com/growthos/crm/faq` | All help/docs links (switch to `/help` later) |
| `SOURCE_CODE_URL` | *(unset)* | AGPL-3.0 §13 source offer. The "Source code" link (app, emails, OpenAPI, MCP card) is only rendered when set. **Must be set to the public repository before launch.** Planned target: `https://github.com/ScalepointVentures/growth-os-crm` (not public yet, so it stays empty). |
| `EMAIL_DRIVER`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER` | `logger` | Production: `smtp`, `smtp.resend.com`, `465` (implicit TLS) or `587` (STARTTLS), user `resend` |
| `RESEND_API_KEY` | – | Used as the SMTP password when `EMAIL_SMTP_PASSWORD` is empty. Secret, never committed |
| `EMAIL_FROM_NAME` / `EMAIL_FROM_ADDRESS` | `ScalePoint Growth OS` / `noreply@scalepoint-ventures.com` | |
| `EMAIL_REPLY_TO` | `support@scalepoint-ventures.com` | Empty string = no Reply-To |
| `IS_EMAIL_VERIFICATION_REQUIRED` | `true` | Public SaaS signups must confirm their email |
| `ALLOW_REQUESTS_TO_TWENTY_ICONS` | `false` | No third-party logo lookups |
| `GROWTH_OS_AI_PROVIDER_LABEL` | `Growth OS AI` | Only label exposed for AI providers in the public `/client-config` |
| `GROWTH_OS_PREFILL_SAMPLE_DATA` | `false` | New workspaces start empty; users can click **Load sample data** (fictional EU set, lead company "Nordlicht Analytics") |

Local testing never sends real mail: `local-boot/mailcatcher.py` (outside this
repository) accepts SMTP on 127.0.0.1:1025 and writes `.eml` files.

## Plans and billing hook

Plan limits (Starter / Growth / Scale, 14-day Growth trial) are enforced in
this codebase; payments run in the separate growth-os-billing service, which
updates a workspace's plan through a signed webhook
(`POST /webhooks/growth-os-billing`, HMAC-SHA256). No Stripe SDK or key is
part of the CRM. Environment variables (`GROWTH_OS_BILLING_WEBHOOK_SECRET`,
`GROWTH_OS_BILLING_URL`, `GROWTH_OS_CHECKOUT_URL`, …), the payload contract and
the local mock (`scripts/growth-os-billing-mock.ts`) are documented in
[GROWTH-OS-BILLING.md](./GROWTH-OS-BILLING.md).

## License

Growth OS CRM is licensed under the **GNU Affero General Public License v3.0**
(see [`LICENSE`](./LICENSE)), inherited from Twenty's AGPL code.

Twenty ships some files under a separate commercial license (marked
`/* @license Enterprise */`). **Those files are not part of Growth OS CRM.**
`scripts/strip-enterprise.ts` deletes them or replaces them with generated
AGPL stubs, and CI fails if a marked file is ever left in the tree or the
build output. Growth OS CRM does not use any Twenty license or organization
key.

### Source code offer (AGPL §13)

Everyone who uses Growth OS CRM over a network can get the complete
corresponding source code of the version they use, free of charge, from the
public repository of this project. The running application links to it.
Questions: crm@scalepoint-ventures.com.

## Build

Requirements: Node.js from [`.nvmrc`](./.nvmrc) (24.x), Yarn 4 (bundled in
`.yarn/releases`, enable with `corepack enable`), about 8 GB RAM.

```bash
corepack enable
yarn install

# Enterprise strip: no-op on a clean tree, required after upstream merges
npx tsx scripts/strip-enterprise.ts
npx tsx scripts/strip-enterprise.ts --check

# Typecheck and build
npx tsx scripts/check-permission-hot-path.ts
npx nx run twenty-server:typecheck && npx nx run twenty-front:typecheck
npx nx run twenty-server:build && npx nx run twenty-front:build
```

Configuration notes for the SaaS build:

- `IS_MULTIWORKSPACE_ENABLED=true` in production (one workspace per customer,
  tenant URL `<slug>.<domain>`). Upstream default stays `false`.
- `MAX_WORKSPACES` caps the number of workspaces on a server; `0` (default)
  means unlimited. There is no license-key based cap.
- `IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS=false` for self-service
  sign-up.

Twenty's billing is hard-disabled in this fork (`IS_BILLING_ENABLED` is always
`false`). Growth OS subscriptions are handled by the separate
`growth-os-billing` service, which is not part of this repository.

## Repository layout

The monorepo layout follows upstream (`packages/twenty-server`,
`packages/twenty-front`, `packages/twenty-shared`, …). Package names are kept
as-is to keep upstream merges simple. Growth OS specific code lives in
`growth-os/` folders inside the packages and in `scripts/`.

## Security

Report security issues to crm@scalepoint-ventures.com. Please do not open
public issues for vulnerabilities.

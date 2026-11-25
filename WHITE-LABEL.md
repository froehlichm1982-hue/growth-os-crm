# Growth OS CRM white label

Growth OS CRM is an AGPL-3.0 fork of [Twenty](https://github.com/twentyhq/twenty).
Customers must only see **Growth OS CRM** / **ScalePoint Ventures**. The one
allowed upstream mention is the AGPL credit "Built on Twenty · AGPL-3.0" in the
app sidebar, the sign-in footer and email footers (plain text, no repository
links). The "Source code (AGPL-3.0)" link is rendered only when
`SOURCE_CODE_URL` is set. **Before launch `SOURCE_CODE_URL` must point to the
public repository (AGPL-3.0 §13 source offer for network users).**
Planned (not yet public, so `SOURCE_CODE_URL` stays empty for now):
`https://github.com/ScalepointVentures/growth-os-crm`.

The layer is kept in a few isolated places so upstream merges stay easy.

## Where the brand lives

| Concern | File(s) |
|---|---|
| Product name, links (legal, help, source), app URL | `packages/twenty-shared/src/i18n/growth-os-white-label.ts` (`GROWTH_OS_BRAND`) |
| Copy rebrand for every locale (front, emails, server) | same file: `withGrowthOsRebrand(i18n)` rewrites catalogs on load and source-text fallbacks on render; wired in `twenty-front/src/utils/i18n/dynamicActivate.ts`, `twenty-shared/src/i18n/create-i18n-instance-factory.ts` (emails), `twenty-server/src/engine/core-modules/i18n/i18n.service.ts` |
| Design tokens (SPV navy/teal, Inter, DM Serif Display, 8px radius), light + dark | `packages/twenty-front/src/growth-os/growth-os-theme.css` (loaded after `twenty-ui/theme-*.css`) |
| Front brand components | `packages/twenty-front/src/growth-os/` (`brand.ts`, `GrowthOsWordmark.tsx`, `GrowthOsSourceNotice.tsx`, `GrowthOsExternalRedirect.tsx`) |
| Logos, favicons, PWA/app icons | `packages/twenty-front/public/images/growth-os/` (brand kit, unchanged) and `scripts/white-label/generate-brand-assets.py` (regenerates every upstream icon PNG in place + the in-app logo SVG) |
| Page title, meta, manifest | `packages/twenty-front/index.html`, `packages/twenty-front/public/manifest.json` |
| Email look (colors, font stack), logo, footer | `packages/twenty-emails/src/common-style.ts`, `components/Logo.tsx`, `components/Footer.tsx`, `components/BaseHead.tsx` |
| Email sender default | `ScalePoint Growth OS <noreply@scalepoint-ventures.com>`, Reply-To `support@scalepoint-ventures.com` (`EMAIL_FROM_*`, `EMAIL_REPLY_TO`); Resend over SMTP with `RESEND_API_KEY` (`email-driver.factory.ts`) |
| App domain | `crm.scalepoint-ventures.com`, workspaces `<ws>.crm.scalepoint-ventures.com` (`DEFAULT_SUBDOMAIN` empty = bare domain is the entry) |
| Help / source links | `HELP_URL` (default `/growthos/crm/faq`), `SOURCE_CODE_URL` (unset = no link); runtime values reach the browser via `generate-front-config.ts` (`window._env_`) |
| Hosting claim | `GROWTH_OS_BRAND.hostingClaim`: "Hosted in the EU (Helsinki, Finland) · GDPR Art. 28 DPA" |

Small one-line edits elsewhere (each marked `Growth OS CRM`): headline font in
`auth/components/Title.tsx` and `onboarding/components/StyledOnboardingStepTitle.ts`,
the auth `Logo`, `FooterNote` (legal links), the sidebar credit in
`NavigationDrawer.tsx`, Settings nav (Community hidden), DPA/Community routes
redirected to our pages, docs links → `GROWTH_OS_BRAND.helpUrl`, MCP server
name, 2FA issuer, CalDAV PRODID, AI/MCP system prompts.

## Gate

`npx tsx scripts/check-white-label.ts` (CI job `white-label`) fails if the
built front, any rebranded catalog, or any rendered email template contains a
customer-visible "twenty" outside the allowlist in the script.

## What intentionally stays (internal, not customer copy)

- Package names, code identifiers, CSS variables, GraphQL type/field names,
  `twenty-shared` etc. Renaming them would break upstream merges.
- Webhook headers `X-Twenty-Webhook-Signature/-Timestamp/-Nonce`: part of the
  public webhook contract; renaming breaks receivers. Document them in our API
  docs as-is (decision: keep, or add `X-GrowthOS-*` aliases later).
- REST/GraphQL paths (`/rest`, `/graphql`, `/metadata`) contain no brand name.
- Developer CLI from `twenty-sdk` (`npx create-twenty-app`, `yarn twenty dev`)
  shown on Settings → Apps → Developer. It is the real binary name.
- Admin Panel (server operators only) links to the upstream Docker image tags.
- Company-logo lookups via `twenty-icons.com` are **off by default**
  (`ALLOW_REQUESTS_TO_TWENTY_ICONS=false`); records show letter avatars.
- `/client-config` names no AI vendor: every provider is labelled
  `GROWTH_OS_AI_PROVIDER_LABEL` (default "Growth OS AI"). Model ids are set by
  the operator; do not configure models whose id contains a vendor name.
- The server-side DPA generator (Twenty's own DPA template) is unreachable from
  the UI (routes redirect to our DPA) but its API still exists.

## Added in the quality-gate pass
- Demo/prefill data (`standard-objects-prefill-data/utils/prefill-*.util.ts`): fictional EU companies on `.example` domains, no avatars (upstream used real founders with photos on twentyhq.github.io), EUR amounts. Upstream constant names (`AIRBNB_ID` …) are kept so merges stay simple.
- Invitation / approved-domain email From: `Name (via Growth OS CRM) <EMAIL_FROM_ADDRESS>`.
- OpenAPI document (`open-api/utils/base-schema.utils.ts`): title, contact, terms, licence link, externalDocs from `GROWTH_OS_BRAND`.
- Public MCP server card (`/.well-known/...`, `build-mcp-server-card.util.ts`): name `com.scalepoint-ventures/growth-os-crm`, title, website, repository.
- Helper AI agent description/prompt; onboarding and invite placeholders (Acme, no Apple people); signup B2B consent line.
- Stays (internal key, not rendered): `/client-config` field name `allowRequestsToTwentyIcons` (value now `false`).
- New workspaces start empty; "Load sample data" (record empty states for Companies/People/Opportunities) loads the fictional EU set once.
- Stays (instance admin only): "Admin Panel" for the first instance user; create the instance admin before opening signup.

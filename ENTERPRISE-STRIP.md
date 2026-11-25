# Enterprise strip

Growth OS CRM ships **AGPL-3.0 code only**. Upstream Twenty marks
commercially licensed files with a `/* @license Enterprise */` header. Those files are
not licensed to us (we have no Twenty license key and will not get one), so
`scripts/strip-enterprise.ts` removes them on every upstream merge.

## What the script does

1. Finds every file under `packages/` that carries the marker.
2. **Deletes** Enterprise files that no remaining AGPL file imports
   (directly or through other stubs).
3. **Stubs** Enterprise files that AGPL code still imports. A stub is generated
   mechanically from the TypeScript AST and keeps only exported names, type
   declarations, enums, decorators and method signatures. Every function and
   method body is replaced:
   - server: `throw new Error('... is an Enterprise feature and was removed')`
     (fail closed),
   - front: components render `null`, other functions return an inert value
     (`packages/twenty-front/src/growth-os/enterpriseStubValue.ts`).
   Stubs carry the `@growth-os-enterprise-stub` tag and must not be edited by hand.
4. **Deletes** AGPL test and story files that import Enterprise code.
5. Updates `enterprise-strip-manifest.json` (full path list) and this file.

`npx tsx scripts/strip-enterprise.ts --check` fails if any marked file is left;
CI runs it on every push.

## Last run

- Upstream ref: `twenty/v2.40.2`
- Marked files found: **370**
- Stubbed: **251** (of which hand-written AGPL overrides: **5**, listed below)
- Deleted Enterprise files: **119**
- Deleted AGPL tests/stories that imported Enterprise code: **59**

## Known consequences (follow-up work)

Stubs make the code compile; they do not restore behaviour. Areas where AGPL
code still calls into a stub at runtime must be rewired to AGPL code paths
(or our own AGPL reimplementation) before production. See the stub list below
and the follow-up section in the README / build briefs. Highest impact:

- Base is `twenty/v2.40.2` on purpose. From v2.41 upstream puts record
  sharing / object readability gating, and from v2.55-v2.58 (#29787, #29824,
  #30007) the core record-permission checks, into Enterprise files on the ORM
  hot path. **Upgrading past v2.40.x requires our own AGPL permission layer.**
  `scripts/check-permission-hot-path.ts` enforces this, and the upstream-sync
  workflow only reports newer releases.
- Row-level permissions (RLS) are an Enterprise feature and are off: the three
  RLS utilities the ORM calls are AGPL overrides that apply no row filter.
- `engine/core-modules/billing/**`, `usage/**`, `usage-limit/**`: billing is
  disabled (`IS_BILLING_ENABLED=false`); Growth OS billing lives in the separate
  growth-os-billing service.
- `engine/core-modules/sso/**`, custom domains, row-level permissions, record
  sharing, validation rules: features removed.

## AGPL overrides

Hand-written replacements in `scripts/enterprise-overrides/` for Enterprise files
on the hot path, giving the "feature removed" behaviour instead of a throwing
stub:

- `packages/twenty-server/src/engine/core-modules/enterprise/services/enterprise-plan.service.ts`
- `packages/twenty-server/src/engine/core-modules/usage/services/usage-recorder.service.ts`
- `packages/twenty-server/src/engine/twenty-orm/utils/render-row-level-permission-filter-to-sql.util.ts`
- `packages/twenty-server/src/engine/twenty-orm/utils/resolve-row-level-permission-record-filter.util.ts`
- `packages/twenty-server/src/engine/twenty-orm/utils/validate-rls-predicates-for-records.util.ts`

## Stubbed files by area

| Path | Files |
| --- | --- |
| `packages/twenty-server/src/engine/core-modules/billing` | 103 |
| `packages/twenty-server/src/engine/core-modules/usage` | 21 |
| `packages/twenty-server/src/engine/metadata-modules/row-level-permission-predicate` | 15 |
| `packages/twenty-server/src/engine/core-modules/sso` | 14 |
| `packages/twenty-server/src/engine/workspace-manager/workspace-migration` | 12 |
| `packages/twenty-server/src/engine/core-modules/enterprise` | 11 |
| `packages/twenty-server/src/engine/core-modules/event-logs` | 11 |
| `packages/twenty-server/src/engine/core-modules/billing-webhook` | 10 |
| `packages/twenty-server/src/engine/core-modules/auth` | 9 |
| `packages/twenty-front/src/modules/settings/security` | 6 |
| `packages/twenty-server/src/engine/twenty-orm/utils` | 5 |
| `packages/twenty-front/src/modules/settings/roles` | 4 |
| `packages/twenty-server/src/engine/core-modules/emailing-domain` | 4 |
| `packages/twenty-server/src/engine/core-modules/jwt` | 4 |
| `packages/twenty-server/src/engine/core-modules/admin-panel` | 3 |
| `packages/twenty-front/src/modules/auth/sign-in-up` | 2 |
| `packages/twenty-server/src/engine/core-modules/cloudflare` | 2 |
| `packages/twenty-server/src/engine/core-modules/usage-limit` | 2 |
| `packages/twenty-server/src/engine/metadata-modules/flat-row-level-permission-predicate` | 2 |
| `packages/twenty-front/src/modules/object-record/hooks` | 1 |
| `packages/twenty-front/src/modules/object-record/record-field` | 1 |
| `packages/twenty-front/src/pages/settings/domains` | 1 |
| `packages/twenty-front/src/pages/settings/security` | 1 |
| `packages/twenty-server/src/database/commands/upgrade-version-command` | 1 |
| `packages/twenty-server/src/engine/core-modules/dns-manager` | 1 |
| `packages/twenty-shared/src/types/RowLevelPermissionPredicate.ts` | 1 |
| `packages/twenty-shared/src/types/RowLevelPermissionPredicateGroup.ts` | 1 |
| `packages/twenty-shared/src/types/RowLevelPermissionPredicateGroupLogicalOperator.ts` | 1 |
| `packages/twenty-shared/src/types/RowLevelPermissionPredicateOperand.ts` | 1 |
| `packages/twenty-shared/src/types/RowLevelPermissionPredicateValue.ts` | 1 |

## Deleted Enterprise files by area

| Path | Files |
| --- | --- |
| `packages/twenty-server/src/engine/core-modules/billing` | 43 |
| `packages/twenty-front/src/modules/settings/security` | 17 |
| `packages/twenty-front/src/modules/settings/roles` | 16 |
| `packages/twenty-server/src/engine/core-modules/billing-webhook` | 13 |
| `packages/twenty-server/src/engine/core-modules/enterprise` | 5 |
| `packages/twenty-server/src/engine/core-modules/usage` | 4 |
| `packages/twenty-server/src/engine/metadata-modules/flat-row-level-permission-predicate` | 4 |
| `packages/twenty-server/src/engine/metadata-modules/row-level-permission-predicate` | 4 |
| `packages/twenty-front/src/modules/settings/domains` | 3 |
| `packages/twenty-server/src/engine/core-modules/usage-limit` | 3 |
| `packages/twenty-front/src/modules/auth/graphql` | 1 |
| `packages/twenty-server/src/engine/core-modules/admin-panel` | 1 |
| `packages/twenty-server/src/engine/core-modules/auth` | 1 |
| `packages/twenty-server/src/engine/core-modules/event-logs` | 1 |
| `packages/twenty-server/src/engine/core-modules/sso` | 1 |
| `packages/twenty-server/src/engine/twenty-orm/utils` | 1 |
| `packages/twenty-server/test/integration/graphql/suites` | 1 |

Full lists: `enterprise-strip-manifest.json`.

## After an upstream merge

1. `git fetch upstream --tags && git merge twenty/vX.Y.Z`.
2. For conflicts on stubbed or deleted Enterprise files, take upstream's version
   (`git checkout --theirs <file>`); the script re-strips it.
3. `npx tsx scripts/strip-enterprise.ts`, then typecheck server and front.
4. Commit with the upstream tag in the message.

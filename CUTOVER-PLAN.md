# CUTOVER-PLAN: how the new Growth OS CRM stack gets onto the server next to the existing CRM

Prepared 27 Nov 2026 (Europe/Berlin). **Document only.** Nothing here was run, nothing was changed on any server. I have no server access; every command below is for OS Lead, and every "current" fact is what I was told, marked **(verify)** where OS Lead should look first.

## 0. Recommendation (3 lines)

1. **Option C: the new SaaS gets its own host pattern, `app.crm.scalepoint-ventures.com` and `*.app.crm.scalepoint-ventures.com`. The old stack, its Caddy routes, certificates, cookies, OAuth callbacks and links stay exactly as they are.** It is the only option where no existing customer-facing route is edited, so it is the only one that fully honours "change nothing on the existing portal, do not touch existing workspaces".
2. Option A (new SaaS on the pretty `*.crm.` wildcard, old workspaces pinned by host) is possible later, as a second, separate change, once a read-only inventory shows nothing of the old stack depends on the bare `crm.` host. Option B (migrating the old workspaces) is not recommended at all: highest risk, no benefit for customers.
3. **Nothing starts before the CX33 resize.** The CX23 has about 1.24 GB free; the image build needs about 8 GB free and the running stack 4 to 6 GB (`server-sizing-and-cohosting.md`). Until the resize the release waits; this plan can be reviewed and the Caddy and DNS parts prepared in the meantime.

## 1. Facts, assumptions, what to verify first (read only)

| Fact | Source |
|---|---|
| Caddy serves `crm.scalepoint-ventures.com` and `*.crm.scalepoint-ventures.com` to the `/opt/spv-crm` twenty-server on `127.0.0.1:3000`; wildcard TLS is Caddy `on_demand` with an `ask` endpoint | OS Lead |
| Existing workspaces: `spv`, `portal`, `oldorff`; they hold internal and customer data; `twenty-portal-1` holds `127.0.0.1:3100` | OS Lead |
| Standing rule: change nothing on the existing portal for customers, do not touch existing workspaces | Markus |
| The new stack: its own directory `/opt/growth-os-crm`, compose project `growth-os-crm`, loopback port **3110**, own DB, Redis and volumes (`deploy/`) | this release |
| CX23: 1.24 GB RAM free. Build about 8 GB free, run 4 to 6 GB | sizing doc |
| Cookies of the app are host-only (no `Domain=` attribute in the front's cookie storage), so a session on `spv.crm.…` is never sent to another host, and two stacks under one parent domain do not share sessions | code |
| Extra subdomain names a customer may not take: Twenty's reserved list contains `app`, `admin`, `api`, `www`, `mail` but **not** `spv`, `portal` or `oldorff`. New: `GROWTH_OS_RESERVED_SUBDOMAINS` (deploy env) | code, this release |

Verify before choosing anything (all read only, OS Lead):

```bash
# 1. The real Caddyfile and the global ask line
sudo caddy adapt --config /etc/caddy/Caddyfile --pretty | less        # or: cat /etc/caddy/Caddyfile
# 2. Which hosts really reach the old stack in the last 30 days (apex? custom domains? api calls?)
sudo jq -r '.request.host' /var/log/caddy/*.log 2>/dev/null | sort | uniq -c | sort -rn | head -30
# 3. Old stack settings that carry the apex host into links or callbacks (names only, do not paste values)
grep -E '^(SERVER_URL|FRONTEND_URL|AUTH_.*CALLBACK|IS_MULTIWORKSPACE_ENABLED|DEFAULT_SUBDOMAIN)=' /opt/spv-crm/.env | sed 's/=.*/=<set>/'
# 4. Which workspaces and domains exist (names only)
docker exec <old-db-container> psql -U <user> -d <db> -Atc 'select subdomain, "customDomain" from core.workspace where "deletedAt" is null'
# 5. Free memory and disk now
free -m; df -h /opt
```

Decide with the answers: if (2) shows traffic on the bare `crm.` host from the portal or from integrations, or (3) shows Google/Microsoft callback URLs on the bare host, option A is off the table for now.

## 2. What is common to all options

**Backups before anything changes (OS Lead):**

```bash
install -d -m 700 /root/cutover-$(date +%F) && cd /root/cutover-$(date +%F)
cp -a /etc/caddy/Caddyfile Caddyfile.before                       # the rollback file
cp -a /var/lib/caddy/.local/share/caddy caddy-storage.tgz.d 2>/dev/null || tar czf caddy-storage.tgz /var/lib/caddy   # certificates and ACME account
docker exec <old-db-container> pg_dumpall -U <user> | gzip > old-crm-pgdumpall.sql.gz   # read only
tar czf old-crm-files.tgz -C /opt/spv-crm .   # env files, compose, local storage volume path is listed in the compose file
```

**Baseline of what customers see today (take now, compare after every change):**

```bash
for h in spv portal oldorff; do
  H=$h.crm.scalepoint-ventures.com
  echo "== $H"
  curl -s -o /dev/null -w 'status=%{http_code}\n' https://$H/healthz
  curl -s https://$H/ | sha256sum
  echo | openssl s_client -connect $H:443 -servername $H 2>/dev/null | openssl x509 -noout -fingerprint -sha256 -enddate
done | tee baseline-before.txt
```

**The new stack itself (identical for every option; this release):** `DEPLOY-READINESS.md` §5, steps 6 to 10 (`preflight.sh`, `deploy.sh --apply`), listening on `127.0.0.1:3110` only, `SEND_EMAILS=false` until GO. Starting it changes nothing on the existing hosts.

**Billing service (all options):** the push webhook is registered once at the new stack's public URL (`https://<new host>/webhooks/growth-os-billing`), the return hosts must allow the new host pattern, and the CRM `FRONTEND_URL`/`SERVER_URL` must be the new apex host. The billing service answers `403/400 return_url_not_allowed` otherwise (**verify** `MODULE_CRM_RETURN_HOSTS` accepts the pattern: `*.app.crm.scalepoint-ventures.com` for C; for A the existing `*.crm.` pattern already does).

**The ask endpoint (item 5 of the release brief).** Twenty has no Caddy ask endpoint of its own (searched the server code: none). This release adds one: `GET /internal/tls-ask?domain=<host>`, answering `200` only for the host named in `FRONTEND_URL` and for `<subdomain>.<that host>` of an existing, not deleted workspace; `404` for everything else, `503` if the database is not ready. It refuses requests that carry `X-Forwarded-For`/`X-Forwarded-Host`, so the public site cannot be used to probe it; the Caddy snippet below also blocks `/internal/*` publicly. Caddy has **one global `ask` URL**, which matters for the options below.

**Reserved names (A only, harmless elsewhere):** `GROWTH_OS_RESERVED_SUBDOMAINS=spv,portal,oldorff` in the new stack's `crm.env`, so no customer of the SaaS can take a name that Caddy routes to the old stack.

**Caddy snippet for the new stack, standalone form** (names and port as in this release; the three options differ only in the host names and in where it is placed):

```caddyfile
# new stack: loopback port 3110, tls-ask on the same port, never public
<NEW-APEX>, *.<NEW-APEX> {
	tls {
		on_demand
	}
	encode zstd gzip
	@internal path /internal/*
	respond @internal 404
	reverse_proxy 127.0.0.1:3110
}
# global options block (only one per Caddyfile): see the options below for the ask line
# {
#	on_demand_tls {
#		ask http://127.0.0.1:3110/internal/tls-ask
#	}
# }
```

`reverse_proxy` already sets `X-Forwarded-For`, `X-Forwarded-Proto` and `X-Forwarded-Host`, and passes the `Host` header and websockets.

## 3. Option C: new SaaS on `app.crm.` (recommended)

**What:** the SaaS lives at `https://app.crm.scalepoint-ventures.com` (entry, signup) and `https://<workspace>.app.crm.scalepoint-ventures.com`. `FRONTEND_URL=SERVER_URL=https://app.crm.scalepoint-ventures.com`. The existing `crm.` and `*.crm.` blocks are not edited. (`*.crm.` matches only one label, so `x.app.crm.` is not caught by it; `app.crm.` itself is, which is why an explicit, more specific site block for it is added: Caddy always prefers the more specific host.)

**Pros**
- No edit to any existing route, certificate, cookie, callback URL, email link or the portal. Old stack processes are not restarted.
- Rollback is two removed site blocks and a reload; DNS records can stay.
- No data migration, no downtime, no version coupling to the old stack.
- Can run in parallel for weeks while the SaaS is tested (human test CRM-01 to CRM-70).

**Cons**
- Longer public URLs (`acme.app.crm.scalepoint-ventures.com`), printed in all customer mails and in the product.
- New DNS records: `app.crm` and `*.app.crm` (the `*.crm` wildcard does not cover `x.app.crm`).
- Marketing/website links to the CRM signup must point to `app.crm.`.
- The global Caddy `ask` must be able to approve both stacks' hosts (below).

**Risks and mitigations**

| Risk | Mitigation |
|---|---|
| One global `ask`: pointing it at the new stack makes Caddy refuse new certificates on the old pattern (e.g. a future old workspace) and, if renewals of on-demand certificates re-ask, could block them | Do **not** repoint it. Use the union ask (appendix A): it asks the existing endpoint first, then the new stack. Existing behaviour for old hosts is unchanged, new hosts are approved by the new stack. If OS Lead prefers: pin the three old hosts as explicit site blocks and point `ask` at the new stack (that is an edit of the old routes, hence not the default) |
| Certificates for `app.crm` and `*.app.crm` hosts | Caddy issues per host on first visit via `on_demand` (HTTP-01/TLS-ALPN, port 80/443 open). Let's Encrypt limits are per registered domain: 50 new certificates per week, 5 duplicates. A launch of a few workspaces is far below; a bulk signup campaign is not (then a DNS-01 wildcard certificate for `*.app.crm` is the fix) |
| Billing return hosts or webhook not matching the new host | See section 2; check `MODULE_CRM_RETURN_HOSTS`; register the webhook at `https://app.crm.scalepoint-ventures.com/webhooks/growth-os-billing` |
| A customer or the website still links to `crm.` for signup | Inventory of links; optional redirect of a specific signup path later (not a route change for existing hosts) |
| Memory | The release waits for the CX33. Add `mem_limit` values in `deploy/docker-compose.yml` if shared with the portal |

**Exact steps (OS Lead)**
1. Section 1 verification, section 2 backups and baseline.
2. CX33 resize done; `free -m` shows 6 GB or more free.
3. DNS (Markus or OS Lead): `app.crm` and `*.app.crm` A/AAAA to the server, low TTL. `dig +short app.crm.scalepoint-ventures.com`, `dig +short x.app.crm.scalepoint-ventures.com`.
4. New stack up on `127.0.0.1:3110` (`DEPLOY-READINESS.md` §5 steps 6 to 10). In `crm.env`: `SERVER_URL`, `FRONTEND_URL` = `https://app.crm.scalepoint-ventures.com`. Check locally: `curl -s localhost:3110/healthz`, `curl -s -o /dev/null -w '%{http_code}\n' 'localhost:3110/internal/tls-ask?domain=app.crm.scalepoint-ventures.com'` (200).
5. Ask union (appendix A) running on `127.0.0.1:3120`, tested with curl for one old host (200) and one unknown host (not 200).
6. Caddy: edit, `caddy validate`, `caddy reload` (graceful, no dropped connections) with the diff below.
7. Billing service: register the webhook, add the return host. `./deploy.sh` smoke: `./smoke.sh https://app.crm.scalepoint-ventures.com https://billing.scalepoint-ventures.com <an existing workspace subdomain>`.
8. Run the verification below, then GO as in `DEPLOY-READINESS.md` §5 steps 13 to 16.

**Caddy config diff**

```diff
 {
 	on_demand_tls {
-		ask <EXISTING-ASK-URL>
+		ask http://127.0.0.1:3120/ask        # union: existing ask first, then the new stack (appendix A)
 	}
 }

 crm.scalepoint-ventures.com, *.crm.scalepoint-ventures.com {
 	...unchanged, still reverse_proxy 127.0.0.1:3000...
 }
+
+app.crm.scalepoint-ventures.com, *.app.crm.scalepoint-ventures.com {
+	tls {
+		on_demand
+	}
+	encode zstd gzip
+	@internal path /internal/*
+	respond @internal 404
+	reverse_proxy 127.0.0.1:3110
+}
```

The only change that touches the old pattern's behaviour is the `ask` line, and the union answers exactly as before for it. (If the existing config has no global `ask` because OS Lead uses a local `permission`/other mechanism, adapt: the point is that old hosts keep their decision and `*.app.crm` hosts get the new stack's.)

**Rollback**
1. `cp /root/cutover-<date>/Caddyfile.before /etc/caddy/Caddyfile && caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`. This restores the old routing and the old `ask` byte for byte.
2. `./deploy.sh --rollback` in `/opt/growth-os-crm` (stops server and worker of that project only; volumes kept).
3. Unregister the webhook in the billing service (or leave it: the outbox answers fail with connection errors and retries, nothing is lost).
4. Nothing to undo for the old stack: it was not touched.

**Backups:** section 2 (Caddyfile, Caddy storage, old DB dump, old files); for the new stack `deploy/backup.sh` (pg_dump with 14-day rotation).

**Verification**
- `diff <(bash baseline-script) baseline-before.txt` for `spv`, `portal`, `oldorff`: status 200, same page hash, **same certificate fingerprint and end date** as before the Caddy reload. Any difference stops the cutover and triggers the rollback.
- Log in to one old workspace (OS Lead's own account) and open the portal workspace read only: unchanged.
- `curl -sI https://app.crm.scalepoint-ventures.com/healthz` 200 with a valid certificate; an unknown host `https://nothing-$RANDOM.app.crm.scalepoint-ventures.com` gets **no** certificate (TLS error), proving the ask works; `https://app.crm.scalepoint-ventures.com/internal/tls-ask?domain=app.crm.scalepoint-ventures.com` is **not** 200.
- `./smoke.sh` 0 FAIL; then the human test.

## 4. Option A: new SaaS takes `crm.` and `*.crm.`; old workspaces pinned by host

**What:** the old stack is reached only through explicit host blocks `spv.crm.…`, `portal.crm.…`, `oldorff.crm.…` (and any other host from the inventory) that point to `127.0.0.1:3000`; the existing apex and wildcard block moves to `127.0.0.1:3110`. Pretty URLs for the SaaS; no data migration.

**Pros:** short URLs, no new DNS, `FRONTEND_URL` stays `https://crm.scalepoint-ventures.com` as in `DEPLOY-READINESS.md`; the old workspaces keep their addresses.

**Cons and risks (this is why it is not first)**
- **The bare host changes owner.** Everything that used `https://crm.scalepoint-ventures.com/...` for the old stack now reaches the SaaS: bookmarks, API calls with keys, **Google/Microsoft OAuth callbacks** if the old stack's `SERVER_URL` is the apex (section 1, check 3), webhook callers, email links built from the apex. Any of these silently breaks for the portal or internal workspaces.
- The old workspaces' certificates are today issued on demand. They must stay valid through the change: pinned blocks reuse stored certificates (check the fingerprint), but a reissue is a change customers could notice.
- A customer of the SaaS taking `spv`, `portal` or `oldorff` would reach the old stack: needs `GROWTH_OS_RESERVED_SUBDOMAINS` (done) and a check at GO.
- One global `ask` again (union or repoint).
- Edits the live route of the portal. Even when done carefully, it is an edit of what customers use.

**Exact steps:** as C steps 1, 2, 4, 7, 8, without new DNS, plus: the host inventory (section 1) is complete; pinned blocks added and reloaded **first** (old behaviour unchanged, baseline compared), only then the apex/wildcard block is switched to 3110 in a second, separate reload.

**Caddy config diff**

```diff
 {
 	on_demand_tls {
-		ask <EXISTING-ASK-URL>
+		ask http://127.0.0.1:3120/ask        # union, appendix A (or http://127.0.0.1:3110/internal/tls-ask if the three hosts below are pinned)
 	}
 }

+# step 1 (reload 1): the old stack, pinned by host, same upstream as today
+spv.crm.scalepoint-ventures.com, portal.crm.scalepoint-ventures.com, oldorff.crm.scalepoint-ventures.com {
+	tls {
+		on_demand
+	}
+	reverse_proxy 127.0.0.1:3000
+}
+
+# step 2 (reload 2): the SaaS takes apex and wildcard
 crm.scalepoint-ventures.com, *.crm.scalepoint-ventures.com {
 	tls {
 		on_demand
 	}
+	@internal path /internal/*
+	respond @internal 404
-	reverse_proxy 127.0.0.1:3000
+	reverse_proxy 127.0.0.1:3110
 }
```

**Rollback:** restore `Caddyfile.before` and reload (about 1 second); `./deploy.sh --rollback`. Because step 1 and step 2 are separate reloads, a problem found after step 2 is undone by reverting just step 2.

**Backups:** as section 2. **Verification:** as C, plus: each old host compared with the baseline after reload 1 **and** after reload 2; the apex answers the SaaS (`/healthz`, signup page); a test signup for the name `portal` is refused ("reserved"); read the old stack's access log for 24 hours after for 4xx/5xx on the apex host.

## 5. Option B: migrate the old workspaces into the new stack

**What:** move `spv`, `portal`, `oldorff` (core rows and workspace schemas, files) into the new stack, then retire the old stack's routes.

**Pros:** one stack, one set of operations, short URLs, one place for updates.

**Cons and risks (high)**
- Twenty has no supported workspace export/import. The practical way is `pg_dump` of the three `workspace_*` schemas plus the matching rows in `core` (workspace, user, userWorkspace, dataSource, appToken, featureFlag, roles and so on), into the new database. Foreign keys, ids, enum types and the metadata cache must line up. This is hand work with no vendor support.
- **Version compatibility:** the old stack's Twenty version is older than this fork (ds-v2 plus billing); migrations only go forward. The workspace migrations (`upgrade` commands) must run on the imported schemas; a failure leaves a half-migrated customer workspace.
- Files and attachments live in the old stack's storage volume, path-keyed by workspace; they must be copied and the references stay valid only if the storage layout matches.
- Users and sessions: password hashes move with `core.user`, but tokens are signed with the old `APP_SECRET`; users are logged out unless the secret is reused (and reusing it ties the two stacks together). Two-factor, API keys and connected accounts (Gmail/Calendar tokens, encrypted with `ENCRYPTION_KEY`) need the same key.
- **Billing side effect:** the new stack creates a billing account and a 14-day Growth trial for every workspace it does not know (`ensureAccountSoon`), sends `trial_started` to its owner, and read-only follows a lapsed trial. Customers and internal staff would receive a trial mail and later a read-only workspace unless each migrated workspace gets a billing account with a permanent plan first. That changes what customers see.
- Downtime: writes must stop during the dump and import; the length depends on database size and files (unknown, **verify** with `\l+`).
- Violates the standing rule in spirit: the customer portal's data and URLs are moved.

**Exact steps (if ever chosen):** (1) full backups (section 2) and a restore rehearsal on a copy; (2) pre-create billing accounts with a non-expiring plan for the three workspaces in the billing service; (3) announce a window; stop writes on the old stack (maintenance page via Caddy for the three hosts only); (4) dump core rows + schemas, copy storage; (5) import into the new DB, run workspace upgrade commands, rebuild metadata cache; (6) point the three hosts at 3110 (Caddy diff as A, reload 2); (7) verify logins, a record count per object against the dump, attachments open, calendar/mail sync reconnects; (8) keep the old stack stopped but untouched for 30 days.

**Caddy config diff:** the same as option A, reload 2, plus a temporary `respond 503` block for the three old hosts during the window.

**Rollback:** possible only until the first write in the new stack: revert the Caddy diff, restart the old stack (which was only stopped). After users write into the new copy, a rollback loses those writes or needs a manual back-merge. **Backups:** section 2 plus a dump of the new DB after import. **Verification:** per-object record counts old vs new, attachment spot checks, login of each tester role, 24 hours of logs.

## 6. Comparison

| | A: wildcard moves, old pinned | B: migrate | C: `app.crm.` (recommended) |
|---|---|---|---|
| Edits the old stack's live routes | yes (apex and wildcard block, three new pinned blocks) | yes (moves them) | **no** (only the global `ask` line, behaviour unchanged by the union) |
| Existing workspaces touched | no data, but apex-dependent flows may break | **yes, all data** | **no** |
| Customer-visible change | possible (bare host) | yes (migration, billing trial) | none |
| Downtime for existing | none planned, risk of surprise | a window | none |
| New DNS | none | none | `app.crm`, `*.app.crm` |
| Public URL of the SaaS | `acme.crm.…` | `acme.crm.…` | `acme.app.crm.…` |
| Rollback | Caddy revert, seconds | partial, loses new writes after first write | Caddy revert, seconds, old stack never involved |
| Effort | medium (inventory, two reloads) | very high | low |
| Fits "untouched" rule | partly | no | **yes** |

**Decision path:** choose C now. After the SaaS is live and the section 1 inventory shows the bare host is unused by the old stack's users and integrations, A can follow as a deliberate second change, with the pinned blocks first. B only if Markus decides the old data must move, with a separate plan and a rehearsal.

## 7. Memory and timing

- The CX23 has 1.24 GB free. The image build needs about 8 GB free; the running SaaS stack (server, worker, Postgres, Redis) needs 4 to 6 GB reserved. **The release waits for the CX33 resize.** Do not try to build on the CX23 (the build would be killed, or it would starve the portal).
- After the resize: confirm `free -m` (at least 6 GB available while the old stack runs), then build; limit with `mem_limit` in the compose file if the host is shared; build once, then `deploy.sh --apply`.
- Prepare in the waiting time: DNS records (C), the billing return hosts and webhook URL, the Caddy diff in a branch of the Caddyfile (not applied), the ask union script, the baseline file.

## Appendix A: union ask for Caddy (new moving part, only for C, and A when the old hosts are not pinned)

Caddy takes one `ask` URL. This small stdlib service asks the existing endpoint first and then the new stack, and answers 200 if either says 200. It changes nothing for old hosts: they get the existing endpoint's answer.

```python
# /opt/growth-os-crm/tls-ask-union.py   run: python3 tls-ask-union.py   (listens on 127.0.0.1:3120, loopback only)
import os, urllib.request, urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

OLD = os.environ["OLD_ASK_URL"]                               # the current global ask URL, e.g. http://127.0.0.1:3000/<existing path>
NEW = "http://127.0.0.1:3110/internal/tls-ask"

def ok(url, domain):
    try:
        with urllib.request.urlopen(f"{url}{'&' if '?' in url else '?'}domain={urllib.parse.quote(domain)}", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False

class H(BaseHTTPRequestHandler):
    def do_GET(self):
        domain = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("domain", [""])[0]
        allowed = bool(domain) and (ok(OLD, domain) or ok(NEW, domain))
        self.send_response(200 if allowed else 403); self.end_headers()
    def log_message(self, *a): pass

HTTPServer(("127.0.0.1", 3120), H).serve_forever()
```

Run it as a systemd unit (`Restart=always`). If it is down, Caddy refuses new certificates (existing ones keep working); add it to the monitoring. Test: old host `curl -s -o /dev/null -w '%{http_code}' 'localhost:3120/ask?domain=spv.crm.scalepoint-ventures.com'` (200 only if the existing endpoint approves it today), unknown host (403).

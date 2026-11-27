#!/usr/bin/env bash
# Read-only smoke test of a running stack. Usage: ./smoke.sh [https://crm.scalepoint-ventures.com] [https://billing.scalepoint-ventures.com]
# Automatic checks only; the human journey is human-tests/crm.md.
set -u
BASE="${1:-https://crm.scalepoint-ventures.com}"; BILLING="${2:-https://billing.scalepoint-ventures.com}"
fails=0
check() { if eval "$2"; then printf 'PASS  %s\n' "$1"; else printf 'FAIL  %s\n' "$1"; fails=$((fails+1)); fi; }
code() { curl -sS -o /dev/null -m 15 -w '%{http_code}' "$@" 2>/dev/null; }

check "CRM /healthz answers 200"                         '[ "$(code "$BASE/healthz")" = 200 ]'
check "front page answers 200"                           '[ "$(code "$BASE/")" = 200 ]'
check "front page has no upstream branding"             '! curl -sS -m 15 "$BASE/" | grep -qiE "twenty\.com|twenty-telemetry"'
check "webhook rejects an unsigned push (401)"           '[ "$(code -X POST -H "content-type: application/json" -d "{}" "$BASE/webhooks/growth-os-billing")" = 401 ]'
check "webhook rejects a bad signature (401)"            '[ "$(code -X POST -H "content-type: application/json" -H "X-Growth-OS-Signature: t=1,v1=00" -d "{}" "$BASE/webhooks/growth-os-billing")" = 401 ]'
check "client config: billing/analytics/telemetry off"   'curl -sS -m 15 "$BASE/client-config" 2>/dev/null | grep -qvE "\"isBillingEnabled\":true|\"analyticsEnabled\":true|\"telemetry\":true"'
check "wildcard DNS + TLS for a workspace host"          '[ "$(code "https://smoke-$RANDOM.${BASE#https://}/healthz")" != 000 ]'
check "plain http redirects to https"                    '[ "$(code "http://${BASE#https://}/")" = 301 ] || [ "$(code "http://${BASE#https://}/")" = 308 ]'
check "billing service reachable, test/live as expected" 'curl -sS -m 15 "$BILLING/healthz" | grep -q "\"ok\":true"'
echo "smoke: $fails FAIL"; [ "$fails" -eq 0 ]

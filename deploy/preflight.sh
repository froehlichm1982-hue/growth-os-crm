#!/usr/bin/env bash
# Pre-flight for the Growth OS CRM production stack. Read-only: changes nothing.
#   ./preflight.sh                 before GO: SEND_EMAILS must NOT be "true"
#   ./preflight.sh --go            at GO: SEND_EMAILS must be "true" and everything else must still hold
#   CRM_ENV=... CRM_SECRETS_ENV=... ./preflight.sh      (defaults: ./crm.env ./crm.secrets.env)
# Exit code 0 = all checks passed, 1 = at least one FAIL.
set -u
cd "$(dirname "$0")"
GO=0; [ "${1:-}" = "--go" ] && GO=1
ENV_FILE="${CRM_ENV:-./crm.env}"; SECRETS_FILE="${CRM_SECRETS_ENV:-./crm.secrets.env}"
fails=0
ok()   { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; fails=$((fails+1)); }
warn() { printf 'WARN  %s\n' "$1"; }
# value of KEY in an env file (last assignment wins, quotes stripped); never prints secrets
val() { [ -f "$2" ] && grep -E "^$1=" "$2" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
mode() { stat -c '%a' "$1" 2>/dev/null; }

[ -f "$ENV_FILE" ] && ok "settings file $ENV_FILE exists" || { fail "settings file $ENV_FILE missing (copy env.production.example)"; echo "preflight: $fails FAIL"; exit 1; }

# privacy and phone-home
[ "$(val TELEMETRY_ENABLED "$ENV_FILE")" = "false" ] && ok "TELEMETRY_ENABLED=false" || fail "TELEMETRY_ENABLED must be exactly false (is '$(val TELEMETRY_ENABLED "$ENV_FILE")')"
[ "$(val ANALYTICS_ENABLED "$ENV_FILE")" = "false" ] && ok "ANALYTICS_ENABLED=false" || fail "ANALYTICS_ENABLED must be false"
for k in SENTRY_DSN SENTRY_FRONT_DSN CLICKHOUSE_URL OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_API_KEY XAI_API_KEY GROQ_API_KEY MISTRAL_API_KEY AI_PROVIDERS ENTERPRISE_KEY ENTERPRISE_VALIDITY_TOKEN RESEND_API_KEY; do
  if [ -n "$(val "$k" "$ENV_FILE")$(val "$k" "$SECRETS_FILE")" ]; then fail "$k must be unset (Sentry, analytics, AI and enterprise stay off)"; fi
done
[ "$(val ALLOW_REQUESTS_TO_TWENTY_ICONS "$ENV_FILE")" != "true" ] && ok "no third-party icon lookups" || fail "ALLOW_REQUESTS_TO_TWENTY_ICONS must not be true"

# mail gate
SEND="$(val SEND_EMAILS "$ENV_FILE")"
if [ "$GO" = 1 ]; then
  [ "$SEND" = "true" ] && ok "SEND_EMAILS=true (GO)" || fail "--go needs SEND_EMAILS=true"
else
  [ -z "$SEND" ] || [ "$SEND" = "false" ] && ok "SEND_EMAILS is not true (before GO)" || fail "SEND_EMAILS is '$SEND' before GO (must be unset or false)"
fi
[ "$(val EMAIL_DRIVER "$ENV_FILE")" = "smtp" ] && ok "EMAIL_DRIVER=smtp" || fail "EMAIL_DRIVER must be smtp"
[ "$(val EMAIL_SMTP_HOST "$ENV_FILE")" = "smtp.resend.com" ] && ok "SMTP host is Resend" || warn "EMAIL_SMTP_HOST is '$(val EMAIL_SMTP_HOST "$ENV_FILE")' (expected smtp.resend.com)"
[ "$(val IS_EMAIL_VERIFICATION_REQUIRED "$ENV_FILE")" = "true" ] && ok "email verification required" || fail "IS_EMAIL_VERIFICATION_REQUIRED must be true"
[ "$(val EMAIL_VERIFICATION_TOKEN_EXPIRES_IN "$ENV_FILE")" = "30m" ] && ok "verification link lives 30m" || fail "EMAIL_VERIFICATION_TOKEN_EXPIRES_IN must be 30m"

# domains
[ "$(val IS_MULTIWORKSPACE_ENABLED "$ENV_FILE")" = "true" ] && ok "IS_MULTIWORKSPACE_ENABLED=true" || fail "IS_MULTIWORKSPACE_ENABLED must be true"
case "$(val SERVER_URL "$ENV_FILE")" in https://crm.scalepoint-ventures.com) ok "SERVER_URL" ;; *) fail "SERVER_URL must be https://crm.scalepoint-ventures.com" ;; esac
[ "$(val FRONTEND_URL "$ENV_FILE")" = "$(val SERVER_URL "$ENV_FILE")" ] && ok "FRONTEND_URL = SERVER_URL" || fail "FRONTEND_URL must equal SERVER_URL"
[ -z "$(val DEFAULT_SUBDOMAIN "$ENV_FILE")" ] && ok "DEFAULT_SUBDOMAIN empty" || fail "DEFAULT_SUBDOMAIN must be empty"
[ -n "$(val SOURCE_CODE_URL "$ENV_FILE")" ] && ! val SOURCE_CODE_URL "$ENV_FILE" | grep -q '<' && ok "SOURCE_CODE_URL set" || { [ "$GO" = 1 ] && fail "SOURCE_CODE_URL must be set at GO (AGPL section 13)" || warn "SOURCE_CODE_URL not set yet (required at GO)"; }
[ "$(val AUTH_GOOGLE_ENABLED "$ENV_FILE")" != "true" ] && [ "$(val AUTH_MICROSOFT_ENABLED "$ENV_FILE")" != "true" ] && ok "no OAuth buttons without real client ids" || warn "AUTH_GOOGLE/MICROSOFT enabled: client ids must be real"

# billing
[ "$(val BILLING_PROVIDER "$ENV_FILE")" = "growth-os" ] && ok "BILLING_PROVIDER=growth-os" || fail "BILLING_PROVIDER must be growth-os (anything else runs the mock)"
case "$(val GROWTH_OS_BILLING_URL "$ENV_FILE")" in https://*) ok "billing URL is https" ;; *) fail "GROWTH_OS_BILLING_URL must be an https URL" ;; esac
[ "$(val IS_BILLING_ENABLED "$ENV_FILE")" != "true" ] && ok "upstream billing stays off" || fail "IS_BILLING_ENABLED must not be true"
[ -z "$(val MODULE_CRM_WEBHOOK_SECRET "$ENV_FILE")$(val MODULE_CRM_WEBHOOK_SECRET "$SECRETS_FILE")" ] && ok "module secret is not in an env file" || fail "MODULE_CRM_WEBHOOK_SECRET must not be set: use the 600 file"
HOSTFILE="${MODULE_CRM_WEBHOOK_SECRET_HOST_FILE:-$(val MODULE_CRM_WEBHOOK_SECRET_HOST_FILE "$ENV_FILE")}"
if [ -z "$HOSTFILE" ] || echo "$HOSTFILE" | grep -q '<'; then fail "MODULE_CRM_WEBHOOK_SECRET_HOST_FILE not set"
elif [ ! -f "$HOSTFILE" ]; then fail "module secret file $HOSTFILE does not exist"
else
  [ "$(mode "$HOSTFILE")" = "600" ] && ok "module secret file is mode 600" || fail "module secret file mode is $(mode "$HOSTFILE"), must be 600"
  [ -s "$HOSTFILE" ] && ok "module secret file is not empty" || fail "module secret file is empty"
  [ "$(stat -c '%u' "$HOSTFILE")" = "1000" ] && ok "owner is uid 1000 (container user)" || warn "owner uid is $(stat -c '%u' "$HOSTFILE"); the container user (uid 1000) must be able to read it"
fi

# secrets file
if [ -f "$SECRETS_FILE" ]; then
  [ "$(mode "$SECRETS_FILE")" = "600" ] && ok "$SECRETS_FILE is mode 600" || fail "$SECRETS_FILE mode is $(mode "$SECRETS_FILE"), must be 600"
  for k in APP_SECRET ENCRYPTION_KEY CRM_DB_PASSWORD EMAIL_SMTP_PASSWORD; do [ -n "$(val $k "$SECRETS_FILE")" ] && ok "$k present" || fail "$k missing in $SECRETS_FILE"; done
else fail "$SECRETS_FILE missing (copy secrets.env.example, chmod 600)"; fi

# separate stack: loopback port must be free and nothing may point at /opt/spv-crm
PORT="${CRM_HTTP_PORT:-$(val CRM_HTTP_PORT "$ENV_FILE")}"; PORT="${PORT:-3110}"
if command -v ss >/dev/null 2>&1; then
  if ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
    docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^growth-os-crm-server' && ok "port $PORT is used by this stack" || fail "port $PORT is already in use by something else"
  else ok "port $PORT is free"; fi
fi
cat docker-compose.yml "$ENV_FILE" | grep -v '^[[:space:]]*#' | grep -q "/opt/spv-crm" && fail "the stack must not reference /opt/spv-crm" || ok "no reference to /opt/spv-crm"

echo "preflight: $fails FAIL"
[ "$fails" -eq 0 ]

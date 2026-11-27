#!/usr/bin/env bash
# Growth OS CRM deploy. DRY RUN BY DEFAULT: prints what it would do and changes nothing.
#   ./deploy.sh                 dry run (also runs the pre-flight)
#   ./deploy.sh --apply         build, back up, start the stack (SEND_EMAILS stays false)
#   ./deploy.sh --go-live       flip SEND_EMAILS=true in crm.env and recreate server+worker (Markus' GO)
#   ./deploy.sh --rollback      stop this stack (the old stack is never touched); see DEPLOY-READINESS.md
# Only this compose project (growth-os-crm) is ever touched. Nothing under /opt/spv-crm.
set -euo pipefail
cd "$(dirname "$0")"
MODE=dry; case "${1:-}" in --apply) MODE=apply ;; --go-live) MODE=golive ;; --rollback) MODE=rollback ;; "") ;; *) echo "unknown option $1"; exit 2 ;; esac
ENV_FILE="${CRM_ENV:-./crm.env}"; SECRETS_FILE="${CRM_SECRETS_ENV:-./crm.secrets.env}"
DC="docker compose -p growth-os-crm --env-file $ENV_FILE --env-file $SECRETS_FILE -f docker-compose.yml"
run() { if [ "$MODE" = dry ]; then echo "DRY-RUN  $*"; else echo "+ $*"; "$@"; fi; }
STAMP="$(date +%Y%m%d-%H%M%S)"

case "$MODE" in
  rollback)
    echo "Rollback: stop only the growth-os-crm project; volumes are kept (nothing deleted)."
    run $DC stop server worker
    echo "Then point the reverse proxy / DNS back to the old stack (OS Lead). Data volumes crm-db, crm-local-data stay for the next try."
    exit 0 ;;
  golive)
    ./preflight.sh >/dev/null || { echo "preflight failed before GO; run ./preflight.sh"; exit 1; }
    echo "GO: SEND_EMAILS=true in $ENV_FILE, then recreate server and worker."
    cp "$ENV_FILE" "$ENV_FILE.pre-go.$STAMP"
    sed -i 's/^SEND_EMAILS=.*/SEND_EMAILS=true/' "$ENV_FILE"
    ./preflight.sh --go || { cp "$ENV_FILE.pre-go.$STAMP" "$ENV_FILE"; echo "GO preflight failed, SEND_EMAILS reverted"; exit 1; }
    run $DC up -d --force-recreate server worker
    ./smoke.sh "$(grep -E '^SERVER_URL=' "$ENV_FILE" | cut -d= -f2-)" "$(grep -E '^GROWTH_OS_BILLING_URL=' "$ENV_FILE" | cut -d= -f2-)" || true
    exit 0 ;;
esac

echo "== 1 pre-flight =="
./preflight.sh
echo "== 2 compose file valid =="
if docker compose version >/dev/null 2>&1; then $DC config -q && echo "compose config OK"; else echo "WARN docker compose plugin not found here; install it on the server (docker compose v2)"; [ "$MODE" = apply ] && exit 1; fi
echo "== 3 image =="
run $DC build server
echo "== 4 backup (only if the database already exists) =="
if [ "$MODE" = apply ] && docker volume inspect growth-os-crm_crm-db >/dev/null 2>&1 && $DC ps -q db 2>/dev/null | grep -q .; then
  mkdir -p backups; $DC exec -T db pg_dump -U crm -d crm -Fc > "backups/crm-$STAMP.dump"; echo "backup backups/crm-$STAMP.dump"
else echo "(no existing database to back up, or dry run)"; fi
echo "== 5 start (db, redis, then server with migrations and cron registration, then worker) =="
run $DC up -d db redis
run $DC up -d server
run $DC up -d worker
echo "== 6 wait for health =="
if [ "$MODE" = apply ]; then
  for i in $(seq 1 60); do curl -fsS "http://127.0.0.1:${CRM_HTTP_PORT:-3100}/healthz" >/dev/null 2>&1 && { echo "healthy"; break; }; sleep 5; [ "$i" = 60 ] && { echo "NOT healthy: $DC logs --tail 100 server"; exit 1; }; done
else echo "DRY-RUN  wait for http://127.0.0.1:${CRM_HTTP_PORT:-3100}/healthz"; fi
[ "$MODE" = dry ] && echo "Dry run finished. Nothing was changed. Use --apply." || echo "Stack is up with SEND_EMAILS=false. Next: reverse proxy + DNS (OS Lead), then ./smoke.sh, then ./deploy.sh --go-live at Markus' GO."

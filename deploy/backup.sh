#!/usr/bin/env bash
# Database backup of the growth-os-crm stack (pg_dump, custom format). Run from cron, e.g. daily 03:15:
#   15 3 * * *  cd /opt/growth-os-crm/repo/deploy && ./backup.sh >> backups/backup.log 2>&1
# Keeps the newest 14 dumps. Touches only the growth-os-crm project.
set -euo pipefail
cd "$(dirname "$0")"
ENV_FILE="${CRM_ENV:-./crm.env}"; SECRETS_FILE="${CRM_SECRETS_ENV:-./crm.secrets.env}"
DC="docker compose -p growth-os-crm --env-file $ENV_FILE --env-file $SECRETS_FILE -f docker-compose.yml"
mkdir -p backups; chmod 700 backups
OUT="backups/crm-$(date +%Y%m%d-%H%M%S).dump"
$DC exec -T db pg_dump -U crm -d crm -Fc > "$OUT" && chmod 600 "$OUT" && echo "backup $OUT ($(du -h "$OUT" | cut -f1))"
ls -1t backups/crm-*.dump | tail -n +15 | xargs -r rm --
# Restore (into an empty database, with the stack stopped except db):
#   $DC exec -T db pg_restore -U crm -d crm --clean --if-exists < backups/crm-YYYYMMDD-HHMMSS.dump

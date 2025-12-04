#!/usr/bin/env bash
set -euo pipefail

# Perform point-in-time recovery (PITR) using WAL-G backups
# Requirements:
#   - /etc/wal-g.d/walg.json populated with storage and Postgres settings
#   - TARGET_TIME set to an ISO 8601 timestamp (e.g. 2025-02-10T14:30:00Z)
#   - PGDATA pointing at the data directory to hydrate
# Optional:
#   - BACKUP_NAME set to a specific WAL-G backup identifier (defaults to LATEST)
#   - AUTO_START=true to start Postgres for validation after recovery prep

TARGET_TIME=${TARGET_TIME:-}
BACKUP_NAME=${BACKUP_NAME:-LATEST}
PGDATA=${PGDATA:-/var/lib/postgresql/data}
AUTO_START=${AUTO_START:-false}

if [[ -z "${TARGET_TIME}" ]]; then
  echo "[ERROR] TARGET_TIME is required for PITR" >&2
  exit 1
fi

if [[ ! -f /etc/wal-g.d/walg.json ]]; then
  echo "[ERROR] /etc/wal-g.d/walg.json not found; cannot load WAL-G configuration" >&2
  exit 1
fi

# shellcheck disable=SC2046
export $(jq -r 'to_entries | .[] | "\(.key)=\(.value)"' /etc/wal-g.d/walg.json)

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

log "Starting PITR using backup '${BACKUP_NAME}' targeting ${TARGET_TIME}"

# Prepare data directory
if [[ -d "${PGDATA}" ]]; then
  log "Cleaning existing data directory at ${PGDATA}"
  rm -rf "${PGDATA}"/*
else
  mkdir -p "${PGDATA}"
fi

# Fetch base backup
log "Fetching base backup with WAL-G..."
wal-g backup-fetch "${PGDATA}" "${BACKUP_NAME}"

# Configure recovery settings for PITR
cat >> "${PGDATA}/postgresql.auto.conf" <<EOCONF
restore_command = 'wal-g wal-fetch %f %p'
recovery_target_time = '${TARGET_TIME}'
recovery_target_action = 'promote'
recovery_target_timeline = 'latest'
EOCONF

touch "${PGDATA}/recovery.signal"

log "Recovery configuration written; data directory ready for startup"

if [[ "${AUTO_START}" == "true" ]]; then
  log "AUTO_START enabled; starting postgres to complete recovery"
  pg_ctl -D "${PGDATA}" -w start
  log "PostgreSQL started; monitor logs to confirm promotion completes"
fi

log "PITR preparation complete"

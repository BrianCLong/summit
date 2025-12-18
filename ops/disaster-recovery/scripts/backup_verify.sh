#!/usr/bin/env bash
set -euo pipefail

# Restores the latest backup into a disposable sandbox and runs integrity checks.
# Requires: BACKUP_BUCKET, AWS_REGION, KMS_KEY_ID, PGDATABASE, PGUSER, PGHOST, PGPASSWORD.

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RESTORE_DIR="/tmp/db-restore-${TIMESTAMP}"
LATEST_ARCHIVE="${RESTORE_DIR}/latest.tar.gz"
SANDBOX_PORT="55432"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

cleanup() {
  if pg_ctl -D "${RESTORE_DIR}/data" status >/dev/null 2>&1; then
    pg_ctl -D "${RESTORE_DIR}/data" -m fast stop || true
  fi
  rm -rf "${RESTORE_DIR}"
}
trap cleanup EXIT

require_env() {
  local var
  for var in "$@"; do
    if [ -z "${!var:-}" ]; then
      log "ERROR missing required env var: ${var}" >&2
      exit 1
    fi
  done
}

require_env BACKUP_BUCKET AWS_REGION KMS_KEY_ID

mkdir -p "${RESTORE_DIR}"

log "Finding latest backup archive"
LATEST_KEY=$(aws s3 ls "${BACKUP_BUCKET}/" --region "${AWS_REGION}" | awk '{print $4}' | sort | tail -n1)
if [ -z "${LATEST_KEY}" ]; then
  log "ERROR no backups found in ${BACKUP_BUCKET}" >&2
  exit 1
fi
aws s3 cp "${BACKUP_BUCKET}/${LATEST_KEY}" "${LATEST_ARCHIVE}" --region "${AWS_REGION}" --sse aws:kms --sse-kms-key-id "${KMS_KEY_ID}"

tar -xzf "${LATEST_ARCHIVE}" -C "${RESTORE_DIR}"

log "Validating checksums"
( cd "${RESTORE_DIR}" && sha256sum --check sha256sums.txt )

log "Running pg_verifybackup"
pg_verifybackup --backup-directory "${RESTORE_DIR}"

log "Restoring into sandbox data directory"
mkdir -p "${RESTORE_DIR}/data"
tar -xzf "${RESTORE_DIR}/base.tar.gz" -C "${RESTORE_DIR}/data"
echo "port = ${SANDBOX_PORT}" >> "${RESTORE_DIR}/data/postgresql.conf"

log "Starting sandbox PostgreSQL"
pg_ctl -D "${RESTORE_DIR}/data" -o "-p ${SANDBOX_PORT}" start
sleep 5

log "Running integrity probes"
psql -p "${SANDBOX_PORT}" -d postgres -c "SELECT current_setting('server_version') AS version, now() AS restored_at;"

log "Dropping sandbox cluster"
pg_ctl -D "${RESTORE_DIR}/data" -m fast stop

log "Verification completed successfully"

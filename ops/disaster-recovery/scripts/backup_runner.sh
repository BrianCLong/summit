#!/usr/bin/env bash
set -euo pipefail

# Automated PostgreSQL backup runner with WAL archiving and metrics emission.
# Requires environment variables: PGHOST, PGUSER, PGPASSWORD (or .pgpass),
# PGDATABASE, BACKUP_BUCKET, WAL_BUCKET, AWS_REGION, KMS_KEY_ID.

START_TS=$(date +%s)
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/tmp/db-backup-${TIMESTAMP}"
META_FILE="${BACKUP_DIR}/metadata.json"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/lib/postgresql/wal_archive}"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

cleanup() {
  rm -rf "${BACKUP_DIR}"
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

require_env PGHOST PGUSER PGDATABASE BACKUP_BUCKET WAL_BUCKET AWS_REGION KMS_KEY_ID

log "Starting backup run"
mkdir -p "${BACKUP_DIR}"

log "Creating base backup"
pg_basebackup \
  --pgdata "${BACKUP_DIR}" \
  --format=tar \
  --gzip \
  --wal-method=stream \
  --checkpoint=fast \
  --manifest \
  --manifest-checksums=sha256 \
  --verbose

log "Computing checksums"
(
  cd "${BACKUP_DIR}"
  sha256sum base.tar.gz backup_manifest > sha256sums.txt
)

log "Writing metadata"
cat > "${META_FILE}" <<META
{
  "timestamp": "${TIMESTAMP}",
  "host": "${PGHOST}",
  "database": "${PGDATABASE}",
  "backup_format": "base.tar.gz",
  "tool": "pg_basebackup",
  "wal_archive_bucket": "${WAL_BUCKET}"
}
META

log "Packaging archive"
ARCHIVE_PATH="${BACKUP_DIR}/backup-${TIMESTAMP}.tar.gz"
tar -czf "${ARCHIVE_PATH}" -C "${BACKUP_DIR}" base.tar.gz backup_manifest metadata.json sha256sums.txt

log "Uploading backup"
aws s3 cp "${ARCHIVE_PATH}" "${BACKUP_BUCKET}/backup-${TIMESTAMP}.tar.gz" \
  --region "${AWS_REGION}" \
  --sse aws:kms \
  --sse-kms-key-id "${KMS_KEY_ID}"

log "Syncing WAL archives from ${WAL_ARCHIVE_DIR}"
aws s3 sync "${WAL_ARCHIVE_DIR}/" "${WAL_BUCKET}/wal/" \
  --region "${AWS_REGION}" \
  --sse aws:kms \
  --sse-kms-key-id "${KMS_KEY_ID}" \
  --delete

log "Emitting metrics"
BACKUP_DURATION=$(( $(date +%s) - START_TS ))
REPLAY_LAG=$(psql -Atc "SELECT COALESCE(EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp()), 0)::int" || echo 0)
cat <<METRICS
backup_duration_seconds ${BACKUP_DURATION}
wal_archive_lag_seconds ${REPLAY_LAG}
METRICS

log "Backup run completed successfully"

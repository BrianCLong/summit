#!/usr/bin/env bash
set -euo pipefail

: "${NEO4J_HOST:?NEO4J_HOST is required}"
: "${NEO4J_BOLT_PORT:=7687}"
: "${NEO4J_DATABASE:=neo4j}"
: "${NEO4J_USERNAME:?NEO4J_USERNAME is required}"
: "${NEO4J_PASSWORD:?NEO4J_PASSWORD is required}"
: "${S3_BUCKET:?S3_BUCKET is required}"
: "${NEO4J_HOME:=/var/lib/neo4j}"

export NEO4J_HOME
export PATH="${NEO4J_HOME}/bin:${PATH}"
BACKUP_PREFIX="${S3_PREFIX:-neo4j/}"
BACKUP_TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_BASENAME="${NEO4J_DATABASE}-${BACKUP_TIMESTAMP}.backup.tar.gz"
BACKUP_DIR="$(mktemp -d /tmp/neo4j-backup.XXXXXX)"
ARCHIVE_PATH="/tmp/${BACKUP_BASENAME}"
BACKUP_MODE="${NEO4J_BACKUP_MODE:-full}" # full or incremental

trap 'rm -rf "${BACKUP_DIR}" "${ARCHIVE_PATH}"' EXIT

NEO4J_FROM="${NEO4J_FROM:-bolt://${NEO4J_HOST}:${NEO4J_BOLT_PORT}}"

neo4j-admin database backup \
  --from="${NEO4J_FROM}" \
  --database="${NEO4J_DATABASE}" \
  --backup-dir="${BACKUP_DIR}" \
  --type="${BACKUP_MODE}" \
  --user="${NEO4J_USERNAME}" \
  --password="${NEO4J_PASSWORD}" \
  --overwrite-destination=true

# The backup command produces files inside ${BACKUP_DIR}/${NEO4J_DATABASE}

tar -C "${BACKUP_DIR}" -czf "${ARCHIVE_PATH}" .

echo "Backup archived to ${ARCHIVE_PATH}" >&2

S3_URI="s3://${S3_BUCKET}/${BACKUP_PREFIX%/}/${BACKUP_BASENAME}"
UPLOAD_ARGS=("s3" "cp" "${ARCHIVE_PATH}" "${S3_URI}")
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
  UPLOAD_ARGS+=("--endpoint-url" "${AWS_ENDPOINT_URL}")
fi

aws "${UPLOAD_ARGS[@]}"

echo "Uploaded backup to ${S3_URI}" >&2

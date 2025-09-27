#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_HOST:?POSTGRES_HOST is required}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DATABASE:?POSTGRES_DATABASE is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${S3_BUCKET:?S3_BUCKET is required}"

BACKUP_PREFIX="${S3_PREFIX:-postgres/}"
BACKUP_TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_BASENAME="${POSTGRES_DATABASE}-${BACKUP_TIMESTAMP}.sql.gz"
BACKUP_PATH="/tmp/${BACKUP_BASENAME}"

export PGPASSWORD="${POSTGRES_PASSWORD}"

pg_dump \
  --host="${POSTGRES_HOST}" \
  --port="${POSTGRES_PORT}" \
  --username="${POSTGRES_USER}" \
  --format=plain \
  --no-owner \
  "${POSTGRES_DATABASE}" \
  | gzip > "${BACKUP_PATH}"

echo "Backup written to ${BACKUP_PATH}" >&2

S3_URI="s3://${S3_BUCKET}/${BACKUP_PREFIX%/}/${BACKUP_BASENAME}"

UPLOAD_ARGS=("s3" "cp" "${BACKUP_PATH}" "${S3_URI}")
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
  UPLOAD_ARGS+=("--endpoint-url" "${AWS_ENDPOINT_URL}")
fi

aws "${UPLOAD_ARGS[@]}"

echo "Uploaded backup to ${S3_URI}" >&2

rm -f "${BACKUP_PATH}"

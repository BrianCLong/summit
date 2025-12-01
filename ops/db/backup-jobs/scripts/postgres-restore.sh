#!/usr/bin/env bash
set -euo pipefail

: "${RESTORE_S3_URI:?RESTORE_S3_URI is required}"
: "${POSTGRES_HOST:?POSTGRES_HOST is required}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DATABASE:?POSTGRES_DATABASE is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

TMP_FILE="$(mktemp /tmp/postgres-restore.XXXXXX.sql.gz)"
CLEAN_TARGET="${CLEAN_TARGET:-false}"

echo "Downloading ${RESTORE_S3_URI} to ${TMP_FILE}" >&2

DOWNLOAD_ARGS=("s3" "cp" "${RESTORE_S3_URI}" "${TMP_FILE}")
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
  DOWNLOAD_ARGS+=("--endpoint-url" "${AWS_ENDPOINT_URL}")
fi

aws "${DOWNLOAD_ARGS[@]}"

export PGPASSWORD="${POSTGRES_PASSWORD}"

if [[ "${CLEAN_TARGET}" == "true" ]]; then
  echo "Dropping existing objects from ${POSTGRES_DATABASE}" >&2
  psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DATABASE}" \
    --command="DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

gunzip -c "${TMP_FILE}" | psql \
  --host="${POSTGRES_HOST}" \
  --port="${POSTGRES_PORT}" \
  --username="${POSTGRES_USER}" \
  --dbname="${POSTGRES_DATABASE}"

echo "Restore completed for ${POSTGRES_DATABASE}" >&2

rm -f "${TMP_FILE}"

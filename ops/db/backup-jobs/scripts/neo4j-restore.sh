#!/usr/bin/env bash
set -euo pipefail

: "${RESTORE_S3_URI:?RESTORE_S3_URI is required}"
: "${NEO4J_DATABASE:=neo4j}"
: "${NEO4J_HOME:=/var/lib/neo4j}"

export NEO4J_HOME
export PATH="${NEO4J_HOME}/bin:${PATH}"
TMP_ARCHIVE="$(mktemp /tmp/neo4j-restore.XXXXXX.tar.gz)"
RESTORE_DIR="$(mktemp -d /tmp/neo4j-restore.XXXXXX)"

trap 'rm -f "${TMP_ARCHIVE}"; rm -rf "${RESTORE_DIR}"' EXIT

echo "Downloading ${RESTORE_S3_URI} to ${TMP_ARCHIVE}" >&2

DOWNLOAD_ARGS=("s3" "cp" "${RESTORE_S3_URI}" "${TMP_ARCHIVE}")
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
  DOWNLOAD_ARGS+=("--endpoint-url" "${AWS_ENDPOINT_URL}")
fi

aws "${DOWNLOAD_ARGS[@]}"

tar -xzf "${TMP_ARCHIVE}" -C "${RESTORE_DIR}"

echo "Loading backup into ${NEO4J_HOME}" >&2

neo4j-admin database load \
  --from-path="${RESTORE_DIR}" \
  --database="${NEO4J_DATABASE}" \
  --overwrite-destination=true

echo "Restore completed for ${NEO4J_DATABASE}" >&2

#!/usr/bin/env bash
set -euo pipefail

# Example PITR restore using WAL-G
# Usage: ISO_TS="2025-09-07T12:34:56Z" ./pitr.sh

WALG_PREFIX=${WALG_PREFIX:-${WALG_GS_PREFIX:-}}
if [[ -z "${WALG_PREFIX}" ]]; then
  echo "Set WALG_PREFIX (e.g., s3://bucket/path or gs://bucket/path)" >&2
  exit 1
fi

DATA_DIR=${DATA_DIR:-/var/lib/postgresql/data}
ISO_TS=${ISO_TS:-}

echo "Fetching latest base backup to ${DATA_DIR}"
wal-g backup-fetch "$DATA_DIR" LATEST

echo "Fetching latest WAL segments"
wal-g wal-fetch LATEST "$DATA_DIR/pg_wal" || true

if [[ -n "${ISO_TS}" ]]; then
  echo "Configuring recovery_target_time=${ISO_TS}"
  echo "recovery_target_time='${ISO_TS}'" >> "$DATA_DIR/postgresql.auto.conf"
fi

echo "Restore prepared. Start Postgres to complete PITR."


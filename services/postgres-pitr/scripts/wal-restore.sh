#!/usr/bin/env bash
set -euo pipefail

# WAL Restore Script for PostgreSQL PITR
# Restores WAL files from S3 using WAL-G
# Called by PostgreSQL restore_command during recovery

WAL_FILE="$1"
WAL_DEST="$2"

# Load WAL-G configuration
export $(cat /etc/wal-g.d/walg.json | jq -r 'to_entries | .[] | "\(.key)=\(.value)"')

# Log restore attempt
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restoring WAL file: $WAL_FILE to $WAL_DEST" >> /var/log/postgresql/wal-restore.log

# Restore using WAL-G
if /usr/local/bin/wal-g wal-fetch "$WAL_FILE" "$WAL_DEST" >> /var/log/postgresql/wal-restore.log 2>&1; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Successfully restored: $WAL_FILE" >> /var/log/postgresql/wal-restore.log
    exit 0
else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FAILED to restore: $WAL_FILE (may not exist yet)" >> /var/log/postgresql/wal-restore.log
    exit 1
fi

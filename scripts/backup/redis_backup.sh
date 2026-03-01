#!/bin/bash
# Redis backup script
set -euo pipefail

echo "Running Redis backup..."

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-}
REDIS_DATA_DIR=${REDIS_DATA_DIR:-/data}
BACKUP_DIR=${BACKUP_DIR:-./backups/redis}
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

mkdir -p "$BACKUP_DIR"

if command -v redis-cli >/dev/null 2>&1; then
  AUTH_ARGS=()
  if [[ -n "$REDIS_PASSWORD" ]]; then
    AUTH_ARGS+=(-a "$REDIS_PASSWORD")
  fi
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" "${AUTH_ARGS[@]}" BGSAVE >/dev/null
  sleep 1
  if [ -f "$REDIS_DATA_DIR/dump.rdb" ]; then
    cp "$REDIS_DATA_DIR/dump.rdb" "$BACKUP_DIR/redis-${TIMESTAMP}.rdb"
    echo "Backup saved to $BACKUP_DIR/redis-${TIMESTAMP}.rdb"
  else
    echo "Redis dump not found at $REDIS_DATA_DIR/dump.rdb" >&2
    exit 1
  fi
else
  echo "redis-cli not found, skipping backup" >&2
  exit 1
fi

echo "Redis backup complete."


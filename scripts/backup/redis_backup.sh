#!/bin/bash
# Redis backup script
set -euo pipefail

echo "Running Redis backup for all partitions..."

# Define partitions
PARTITIONS=("default" "cache" "dist")

TIMESTAMP=$(date +"%Y%m%d%H%M%S")

for PARTITION in "${PARTITIONS[@]}"; do
  echo "Backing up Redis partition: $PARTITION"

  if [ "$PARTITION" = "default" ]; then
    REDIS_HOST=${REDIS_HOST:-redis}
    REDIS_PORT=${REDIS_PORT:-6379}
    REDIS_PASSWORD=${REDIS_PASSWORD:-}
    REDIS_DATA_DIR=${REDIS_DATA_DIR:-/data}
    BACKUP_DIR=${BACKUP_DIR:-./backups/redis}
    FILE_PREFIX="redis"
  elif [ "$PARTITION" = "cache" ]; then
    REDIS_HOST=${REDIS_CACHE_HOST:-redis-cache}
    REDIS_PORT=${REDIS_CACHE_PORT:-6380}
    REDIS_PASSWORD=${REDIS_CACHE_PASSWORD:-}
    REDIS_DATA_DIR=${REDIS_CACHE_DATA_DIR:-/data}
    BACKUP_DIR=${BACKUP_CACHE_DIR:-./backups/redis-cache}
    FILE_PREFIX="redis-cache"
  elif [ "$PARTITION" = "dist" ]; then
    REDIS_HOST=${REDIS_DIST_HOST:-redis-dist}
    REDIS_PORT=${REDIS_DIST_PORT:-6381}
    REDIS_PASSWORD=${REDIS_DIST_PASSWORD:-}
    REDIS_DATA_DIR=${REDIS_DIST_DATA_DIR:-/data}
    BACKUP_DIR=${BACKUP_DIST_DIR:-./backups/redis-dist}
    FILE_PREFIX="redis-dist"
  fi

  mkdir -p "$BACKUP_DIR"

  if command -v redis-cli >/dev/null 2>&1; then
    AUTH_ARGS=()
    if [[ -n "$REDIS_PASSWORD" ]]; then
      AUTH_ARGS+=(-a "$REDIS_PASSWORD")
    fi

    echo "Triggering BGSAVE on $REDIS_HOST:$REDIS_PORT..."
    if redis-cli -h "$REDIS_HOST" -p "6379" "${AUTH_ARGS[@]}" BGSAVE >/dev/null 2>&1 || redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" "${AUTH_ARGS[@]}" BGSAVE >/dev/null 2>&1; then
      sleep 2

      # Try docker cp first as it is more reliable in docker-compose setups
      if command -v docker-compose >/dev/null 2>&1; then
        echo "Attempting docker-compose cp from $REDIS_HOST container..."
        if docker-compose -f docker-compose.dev.yml cp "$REDIS_HOST:/data/dump.rdb" "$BACKUP_DIR/${FILE_PREFIX}-${TIMESTAMP}.rdb" >/dev/null 2>&1; then
          echo "Backup saved to $BACKUP_DIR/${FILE_PREFIX}-${TIMESTAMP}.rdb via docker-compose"
          continue
        fi
      fi

      if command -v docker >/dev/null 2>&1; then
        echo "Attempting docker cp from $REDIS_HOST container..."
        # Find container id by name matching the host
        CONTAINER_ID=$(docker ps -q -f name=$REDIS_HOST)
        if [ -n "$CONTAINER_ID" ]; then
          if docker cp "$CONTAINER_ID:/data/dump.rdb" "$BACKUP_DIR/${FILE_PREFIX}-${TIMESTAMP}.rdb" >/dev/null 2>&1; then
            echo "Backup saved to $BACKUP_DIR/${FILE_PREFIX}-${TIMESTAMP}.rdb via docker"
            continue
          fi
        fi
      fi

      # Fallback to direct file copy if mapped
      if [ -f "$REDIS_DATA_DIR/dump.rdb" ]; then
        cp "$REDIS_DATA_DIR/dump.rdb" "$BACKUP_DIR/${FILE_PREFIX}-${TIMESTAMP}.rdb"
        echo "Backup saved to $BACKUP_DIR/${FILE_PREFIX}-${TIMESTAMP}.rdb"
      else
        echo "Warning: Could not save backup for $PARTITION - dump.rdb not found locally and docker cp failed" >&2
      fi
    else
      echo "Warning: Could not connect to $REDIS_HOST:$REDIS_PORT or trigger BGSAVE" >&2
    fi
  else
    echo "redis-cli not found, skipping backup" >&2
    exit 1
  fi
done

echo "Redis backups complete."

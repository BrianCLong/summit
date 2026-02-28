#!/bin/bash
# Redis restore script
set -euo pipefail

echo "Running Redis restore..."

# Check for required arguments
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <partition: default|cache|dist> <path_to_redis_backup.rdb>" >&2
  echo "Example: $0 cache ./backups/redis-cache/redis-cache-20231027123456.rdb" >&2
  exit 1
fi

PARTITION=$1
BACKUP_FILE_PATH=$2

if [ "$PARTITION" != "default" ] && [ "$PARTITION" != "cache" ] && [ "$PARTITION" != "dist" ]; then
  echo "Error: Invalid partition '$PARTITION'. Must be default, cache, or dist." >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE_PATH" ]; then
  echo "Error: Backup file not found at $BACKUP_FILE_PATH" >&2
  exit 1
fi

# Map partition to container name
if [ "$PARTITION" = "default" ]; then
  CONTAINER="redis"
elif [ "$PARTITION" = "cache" ]; then
  CONTAINER="redis-cache"
elif [ "$PARTITION" = "dist" ]; then
  CONTAINER="redis-dist"
fi

REDIS_DATA_DIR_CONTAINER=/data

# Check if using docker-compose
if command -v docker-compose >/dev/null 2>&1 && [ -f docker-compose.dev.yml ]; then
  echo "Stopping $CONTAINER service..."
  docker-compose -f docker-compose.dev.yml stop "$CONTAINER"

  echo "Copying $BACKUP_FILE_PATH to $CONTAINER container..."
  docker-compose -f docker-compose.dev.yml cp "$BACKUP_FILE_PATH" "$CONTAINER":"${REDIS_DATA_DIR_CONTAINER}/dump.rdb"

  echo "Starting $CONTAINER service..."
  docker-compose -f docker-compose.dev.yml start "$CONTAINER"

elif command -v docker >/dev/null 2>&1; then
  # Fallback to docker
  CONTAINER_ID=$(docker ps -a -q -f name=$CONTAINER | head -n 1)

  if [ -n "$CONTAINER_ID" ]; then
    echo "Stopping container $CONTAINER..."
    docker stop "$CONTAINER_ID"

    echo "Copying backup to container $CONTAINER..."
    docker cp "$BACKUP_FILE_PATH" "$CONTAINER_ID:${REDIS_DATA_DIR_CONTAINER}/dump.rdb"

    echo "Starting container $CONTAINER..."
    docker start "$CONTAINER_ID"
  else
    echo "Error: Could not find container for $CONTAINER" >&2
    exit 1
  fi
else
  echo "Error: Neither docker-compose nor docker command found." >&2
  exit 1
fi

echo "Redis restore complete for partition: $PARTITION."

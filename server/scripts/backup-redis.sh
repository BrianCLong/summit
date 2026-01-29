#!/bin/bash
set -e

# Configuration
BACKUP_DIR="./backups/redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
# Optional: Set REDIS_PASSWORD environment variable if your Redis requires authentication

# Find Redis container ID using docker compose (assuming service name 'redis')
# If running via docker-compose
CONTAINER_ID=$(docker compose ps -q redis 2>/dev/null || docker-compose ps -q redis 2>/dev/null)

if [ -z "$CONTAINER_ID" ]; then
  # Fallback: try to find by image name or common name pattern if compose failed
  CONTAINER_ID=$(docker ps -qf "name=redis" | head -n 1)
fi

if [ -z "$CONTAINER_ID" ]; then
  echo "Error: Redis container not found. Please ensure the redis service is running."
  exit 1
fi

echo "Found Redis container: $CONTAINER_ID"
mkdir -p "$BACKUP_DIR"

echo "Triggering BGSAVE on Redis..."
REDIS_CLI_ARGS=""
if [ -n "$REDIS_PASSWORD" ]; then
  REDIS_CLI_ARGS="-a $REDIS_PASSWORD --no-auth-warning"
fi

docker exec "$CONTAINER_ID" redis-cli $REDIS_CLI_ARGS BGSAVE

echo "Waiting for BGSAVE to complete..."
# Loop until rdb_bgsave_in_progress is 0
while [ "$(docker exec "$CONTAINER_ID" redis-cli $REDIS_CLI_ARGS info persistence | grep rdb_bgsave_in_progress | tr -d '\r\n' | cut -d: -f2)" -eq 1 ]; do
  echo "Backup in progress..."
  sleep 1
done

echo "BGSAVE completed."

echo "Copying dump.rdb..."
docker cp "$CONTAINER_ID":/data/dump.rdb "$BACKUP_DIR/dump_$TIMESTAMP.rdb"

# Check for AOF file and copy if exists
# Note: Since Redis 7, AOF can be a directory (appendonlydir). Checking both file and dir.
if docker exec "$CONTAINER_ID" test -d /data/appendonlydir; then
    echo "Copying appendonlydir..."
    docker cp "$CONTAINER_ID":/data/appendonlydir "$BACKUP_DIR/appendonlydir_$TIMESTAMP"
elif docker exec "$CONTAINER_ID" test -f /data/appendonly.aof; then
    echo "Copying appendonly.aof..."
    docker cp "$CONTAINER_ID":/data/appendonly.aof "$BACKUP_DIR/appendonly_$TIMESTAMP.aof"
fi

echo "Backup complete. Files saved to $BACKUP_DIR"

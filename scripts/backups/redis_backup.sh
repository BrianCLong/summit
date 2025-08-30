#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +"%Y-%m-%dT%H-%M-%S")
FILE="redis-${DATE}.rdb"

echo "Triggering Redis RDB snapshot"
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SAVE

echo "Copying RDB from Redis persistent volume"
if [[ -f /data/dump.rdb ]]; then
  cp /data/dump.rdb "/tmp/${FILE}"
else
  echo "RDB file not found at /data/dump.rdb"
  exit 1
fi

echo "Uploading to S3: s3://${BACKUP_BUCKET}/redis/${FILE}"
aws s3 cp "/tmp/${FILE}" "s3://${BACKUP_BUCKET}/redis/${FILE}"
echo "Done."


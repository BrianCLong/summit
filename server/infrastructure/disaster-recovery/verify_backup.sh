#!/bin/bash
set -eo pipefail

echo "Starting Backup Verification..."

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"

# 1. Find latest backup
LATEST_BACKUP=$(find "$BACKUP_ROOT" -name "backup-*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")

if [ -z "$LATEST_BACKUP" ]; then
    echo "No local backups found in $BACKUP_ROOT."
    # Optional: Check S3?
    exit 0
fi

echo "Verifying latest backup: $LATEST_BACKUP"

# 2. Verify Checksum if present
if [ -f "$LATEST_BACKUP.sha256" ]; then
    EXPECTED_HASH=$(cat "$LATEST_BACKUP.sha256" | awk '{print $1}')
    ACTUAL_HASH=$(sha256sum "$LATEST_BACKUP" | awk '{print $1}')

    if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
        echo "❌ Checksum verification FAILED!"
        exit 1
    else
        echo "✅ Checksum verified."
    fi
else
    echo "⚠️ No checksum file found."
fi

# 3. Verify Structure (list tar contents)
echo "Verifying archive structure..."
CONTENTS=$(tar -tf "$LATEST_BACKUP")

if echo "$CONTENTS" | grep -q "metadata.json"; then
    echo "✅ metadata.json found."
else
    echo "❌ metadata.json MISSING."
    exit 1
fi

if echo "$CONTENTS" | grep -q "postgres.dump"; then
    echo "✅ postgres.dump found."
else
    echo "❌ postgres.dump MISSING."
    exit 1
fi

# Redis is optional depending on setup, but let's check if we expect it
# if echo "$CONTENTS" | grep -q "redis.rdb"; then
#     echo "✅ redis.rdb found."
# fi

echo "Backup verification completed successfully."

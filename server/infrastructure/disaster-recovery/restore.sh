#!/bin/bash
set -eo pipefail

TIMESTAMP=$1
FORCE=$2

if [ -z "$TIMESTAMP" ]; then
    echo "Usage: ./restore.sh <timestamp> [--force]"
    echo "Example: ./restore.sh 20231025_120000"
    exit 1
fi

BACKUP_ROOT="/backups"
ARCHIVE_NAME="backup-$TIMESTAMP.tar.gz"
LOCAL_ARCHIVE="$BACKUP_ROOT/$ARCHIVE_NAME"

# Safety Warning
if [ "$FORCE" != "--force" ]; then
    echo "WARNING: This will OVERWRITE the current database and Redis data."
    echo "Are you sure you want to proceed? (Type 'yes' to confirm)"
    read -r CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Restore cancelled."
        exit 1
    fi
fi

# Download from S3 if not local
if [ ! -f "$LOCAL_ARCHIVE" ]; then
    if [ ! -z "$S3_BUCKET" ]; then
        echo "Downloading from S3..."
        AWS_ARGS=""
        if [ ! -z "$S3_ENDPOINT" ]; then
            AWS_ARGS="--endpoint-url $S3_ENDPOINT"
        fi

        aws s3 cp $AWS_ARGS "s3://$S3_BUCKET/$ARCHIVE_NAME" "$LOCAL_ARCHIVE"

        # Try to download checksum
        aws s3 cp $AWS_ARGS "s3://$S3_BUCKET/$ARCHIVE_NAME.sha256" "$LOCAL_ARCHIVE.sha256" || echo "No checksum file found in S3."
    else
        echo "Error: Backup archive not found locally and S3 not configured."
        exit 1
    fi
fi

# Verify Checksum if available
if [ -f "$LOCAL_ARCHIVE.sha256" ]; then
    echo "Verifying checksum..."
    EXPECTED_HASH=$(cat "$LOCAL_ARCHIVE.sha256" | awk '{print $1}')
    ACTUAL_HASH=$(sha256sum "$LOCAL_ARCHIVE" | awk '{print $1}')

    if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
        echo "ERROR: Checksum verification failed!"
        echo "Expected: $EXPECTED_HASH"
        echo "Actual:   $ACTUAL_HASH"
        exit 1
    fi
    echo "Checksum verified."
else
    echo "Warning: No checksum file found. Skipping verification."
fi

# Extract
echo "Extracting backup..."
tar -xzf "$LOCAL_ARCHIVE" -C "$BACKUP_ROOT"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Extraction failed, directory $BACKUP_DIR not created."
    exit 1
fi

# Restore Postgres
echo "Restoring PostgreSQL..."
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-postgres}
export PGPASSWORD=${POSTGRES_PASSWORD:-postgres}

if [ -f "$BACKUP_DIR/postgres.dump" ]; then
    pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists "$BACKUP_DIR/postgres.dump"
    echo "PostgreSQL restored."
else
    echo "Warning: postgres.dump not found in backup."
fi

# Restore Redis
echo "Restoring Redis..."
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-devpassword}

if [ -f "$BACKUP_DIR/redis.rdb" ]; then
    # We need to access the redis volume directly or use redis-cli --pipe (which is for raw protocol)
    # redis-cli doesn't support restoring an RDB file remotely easily.
    # The standard way is to replace the dump.rdb file and restart Redis.

    if [ -d "/redis_data" ]; then
        echo "Copying RDB to /redis_data/dump.rdb..."
        cp "$BACKUP_DIR/redis.rdb" "/redis_data/dump.rdb"

        echo "Restarting Redis to load new data..."
        REDIS_CLI_ARGS=(-h "$REDIS_HOST" -p "$REDIS_PORT")
        if [ ! -z "$REDIS_PASSWORD" ] && [ "$REDIS_PASSWORD" != "devpassword" ]; then
            REDIS_CLI_ARGS+=(-a "$REDIS_PASSWORD" --no-auth-warning)
        fi

        if command -v redis-cli &> /dev/null; then
            redis-cli "${REDIS_CLI_ARGS[@]}" shutdown nosave || true
            echo "Redis shutdown signal sent. Docker should restart it."
        else
            echo "Warning: redis-cli not found. Cannot automatically restart Redis."
            echo "Please restart the Redis container manually to load the new RDB file."
        fi
    else
        echo "Warning: /redis_data is not mounted. Cannot restore Redis RDB automatically."
        echo "Manual intervention required: Place $BACKUP_DIR/redis.rdb into the Redis data volume and restart Redis."
    fi
else
    echo "Warning: redis.rdb not found in backup."
fi

# Neo4j Restore
echo "Restoring Neo4j..."
if [ -f "$BACKUP_DIR/neo4j_data.tar.gz" ]; then
    if [ -d "/neo4j_data" ]; then
        echo "WARNING: Clearing existing /neo4j_data..."
        # Depending on permissions, this might require specific handling, but we are likely root in container
        rm -rf /neo4j_data/*

        echo "Extracting Neo4j backup..."
        # Archive was created with -C / neo4j_data, so it contains neo4j_data root folder.
        # Extracting to / should place it back in /neo4j_data
        if tar -xzf "$BACKUP_DIR/neo4j_data.tar.gz" -C /; then
             echo "Neo4j restored."
        else
             echo "Error: Neo4j extraction failed."
             exit 1
        fi
    else
        echo "Warning: /neo4j_data is not mounted. Cannot restore Neo4j data."
    fi
else
    echo "Warning: neo4j_data.tar.gz not found in backup."
fi

# Cleanup
echo "Cleaning up extracted files..."
rm -rf "$BACKUP_DIR"

echo "Restore completed successfully."

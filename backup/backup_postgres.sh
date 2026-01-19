#!/bin/bash
set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-maestro}"
POSTGRES_DB="${POSTGRES_DB:-maestro}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}" # Optional: Can be set via env var
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting Postgres backup for $POSTGRES_DB at $DATE..."

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "Error: pg_dump is not installed or not in PATH."
    exit 1
fi

# Export PGPASSWORD if set, otherwise rely on .pgpass or trust auth
if [ -n "$POSTGRES_PASSWORD" ]; then
    export PGPASSWORD="$POSTGRES_PASSWORD"
fi

# Perform backup
# Using custom format (-Fc) which is compressed and allows for parallel restore
pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$BACKUP_DIR/${POSTGRES_DB}_${DATE}.dump"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_DIR/${POSTGRES_DB}_${DATE}.dump"
else
    echo "Backup failed!"
    exit 1
fi

# Optional: Rotate old backups (keep last 7 days)
find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.dump" -mtime +7 -delete
echo "Old backups cleaned up."

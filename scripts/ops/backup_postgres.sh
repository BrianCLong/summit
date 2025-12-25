#!/bin/bash
set -e

# Configuration
BACKUP_DIR="backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/maestro_backup_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"
RETENTION_DAYS=7
CONTAINER_NAME="${DB_CONTAINER_NAME:-maestro-postgres}"
DB_USER="${DB_USER:-maestro}"
DB_NAME="${DB_NAME:-maestro}"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Check for encryption key
if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
  echo "Error: BACKUP_ENCRYPTION_KEY environment variable is not set."
  echo "Please set it to a secure passphrase."
  exit 1
fi

# Check for Password
if [ -z "$PG_PASSWORD" ]; then
    echo "Warning: PG_PASSWORD not set. Using default 'maestro-dev-secret'. UNSAFE FOR PRODUCTION."
    PG_PASSWORD="maestro-dev-secret"
fi

echo "Starting backup for ${DB_NAME} at ${TIMESTAMP}..."

# Perform backup
# We stream pg_dump output directly to openssl to avoid storing unencrypted data on disk
if docker exec -e PGPASSWORD="$PG_PASSWORD" "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" | \
   openssl enc -aes-256-cbc -salt -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -out "${ENCRYPTED_FILE}"; then
  echo "Backup created and encrypted successfully: ${ENCRYPTED_FILE}"
else
  echo "Backup failed!"
  exit 1
fi

# Retention Policy: Delete backups older than RETENTION_DAYS
echo "Applying retention policy (keeping backups for ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "maestro_backup_*.sql.enc" -type f -mtime +${RETENTION_DAYS} -delete

echo "Backup process completed."

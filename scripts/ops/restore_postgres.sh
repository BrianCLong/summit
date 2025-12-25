#!/bin/bash
set -e

# Configuration
CONTAINER_NAME="${DB_CONTAINER_NAME:-maestro-postgres}"
DB_USER="${DB_USER:-maestro}"
DB_NAME="${DB_NAME:-maestro}"

if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_encrypted_backup_file>"
  exit 1
fi

BACKUP_FILE="$1"

# Check for encryption key
if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
  echo "Error: BACKUP_ENCRYPTION_KEY environment variable is not set."
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: File ${BACKUP_FILE} not found."
  exit 1
fi

# Check for Password
if [ -z "$PG_PASSWORD" ]; then
    echo "Warning: PG_PASSWORD not set. Using default 'maestro-dev-secret'. UNSAFE FOR PRODUCTION."
    PG_PASSWORD="maestro-dev-secret"
fi

echo "Restoring from ${BACKUP_FILE}..."

# Decrypt and restore
# WARNING: This will overwrite the existing database!
# We pipe the decrypted stream directly to psql inside the container

echo "WARNING: This will overwrite the '${DB_NAME}' database in container '${CONTAINER_NAME}'."
echo "Press Ctrl+C to cancel within 5 seconds..."
sleep 5

echo "Dropping and recreating public schema..."
docker exec -e PGPASSWORD="$PG_PASSWORD" "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Restoring data..."
if openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "${BACKUP_FILE}" | \
   docker exec -i -e PGPASSWORD="$PG_PASSWORD" "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"; then
  echo "Restore completed successfully."
else
  echo "Restore failed!"
  exit 1
fi

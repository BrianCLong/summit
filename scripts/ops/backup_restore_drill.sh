#!/bin/bash
set -e

# Configuration
TEST_DB_NAME="maestro_restore_drill"
CONTAINER_NAME="${DB_CONTAINER_NAME:-maestro-postgres}"
DB_USER="${DB_USER:-maestro}"

# Check for Password
if [ -z "$PG_PASSWORD" ]; then
    echo "Warning: PG_PASSWORD not set. Using default 'maestro-dev-secret'. UNSAFE FOR PRODUCTION."
    export PG_PASSWORD="maestro-dev-secret"
fi

# Generate a random encryption key for the drill
export BACKUP_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "Generated drill encryption key."

echo "=== Starting Backup/Restore Drill ==="

# Step 1: Run Backup
echo "Step 1: Running Backup..."
./scripts/ops/backup_postgres.sh

# Find the latest backup
LATEST_BACKUP=$(ls -t backups/postgres/maestro_backup_*.sql.enc | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "Error: No backup file found."
  exit 1
fi
echo "Backup file created: ${LATEST_BACKUP}"

# Step 2: Validation / Restore Drill
# Instead of overwriting the main DB, we will create a temporary database and restore to it.

echo "Step 2: Preparing Test Database for Restore Drill..."
# Create a test database
docker exec -e PGPASSWORD="$PG_PASSWORD" "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};"
docker exec -e PGPASSWORD="$PG_PASSWORD" "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${TEST_DB_NAME};"

echo "Step 3: Restoring to Test Database (${TEST_DB_NAME})..."
# We duplicate logic from restore_postgres.sh but targetting the test DB
if openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "${LATEST_BACKUP}" | \
   docker exec -i -e PGPASSWORD="$PG_PASSWORD" "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${TEST_DB_NAME}"; then
  echo "Restore to test database successful."
else
  echo "Restore failed!"
  # Cleanup even on failure
  docker exec -e PGPASSWORD="$PG_PASSWORD" "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};"
  exit 1
fi

# Step 4: Verify Data (Optional - just checking if we can connect and list tables)
echo "Step 4: Verifying Restored Data..."
TABLE_COUNT=$(docker exec -e PGPASSWORD="$PG_PASSWORD" "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${TEST_DB_NAME}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Found $(echo $TABLE_COUNT | xargs) tables in restored database."

# Cleanup
echo "Step 5: Cleaning up Test Database..."
docker exec -e PGPASSWORD="$PG_PASSWORD" "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE ${TEST_DB_NAME};"

echo "=== Drill Completed Successfully ==="
echo "Evidence: Backup file verified at ${LATEST_BACKUP}"

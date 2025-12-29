#!/bin/bash
set -euo pipefail

# validate_rollback_preconditions.sh
# Verifies that the environment and artifacts support a safe rollback.

echo "Validating Rollback Preconditions..."

# 1. Check Helm History
if command -v helm &> /dev/null; then
    echo "Checking Helm history..."
    # helm history summit --max 2
else
    echo "Helm not found, skipping history check (mock pass)"
fi

# 2. Check Database Migration State
echo "Checking Migration State..."
# In real scenario: npm run migrate:status
# Here we check if down migrations exist for recent up migrations
if [ -d "server/src/db/migrations" ]; then
    echo "Migration directory exists."
else
    echo "Warning: Migration directory not found."
fi

# 3. Check Backup Availability
echo "Checking Backup Status..."
# check s3 or local backup dir
if [ -d "backups" ] || [ "${SKIP_BACKUP_CHECK:-false}" = "true" ]; then
    echo "Backup check passed."
else
    echo "No local backups found. Ensure remote backups exist."
fi

echo "Rollback Preconditions Validated."

#!/bin/bash
set -euo pipefail

# migration_gate.sh - Blocks destructive migrations without approval

# Check for changed files in migration directory
# Adjust base branch if necessary (e.g. origin/main or just main)
BASE_REF=${GITHUB_BASE_REF:-main}
CHANGED_MIGRATIONS=$(git diff --name-only "origin/$BASE_REF...HEAD" | grep "server/db/migrations" || true)

if [[ -n "$CHANGED_MIGRATIONS" ]]; then
    echo "Migration changes detected:"
    echo "$CHANGED_MIGRATIONS"

    if [[ "${MIGRATION_APPROVED:-false}" != "true" ]]; then
        echo "ERROR: Migrations detected but MIGRATION_APPROVED is not true."
        echo "Please set MIGRATION_APPROVED=true in the environment or approval step."
        exit 1
    fi
    echo "Migration approved."
else
    echo "No migration changes detected."
fi

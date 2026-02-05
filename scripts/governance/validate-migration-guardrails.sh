#!/usr/bin/env bash
# validate-migration-guardrails.sh
# Enforces safe database migration practices
#
# Checks:
# 1. Rollback script presence (filename.rollback.sql for filename.sql)
# 2. Lock-time budget (search for ACCESS EXCLUSIVE locks or heavy ALTERs)
# 3. Transaction wrapping
#
# Usage:
#   ./scripts/governance/validate-migration-guardrails.sh
#
# Authority: 90_DAY_WAR_ROOM_BACKLOG.md (Task 64)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MIGRATIONS_DIR="${REPO_ROOT}/server/src/db/migrations"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "[migration-guard] $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }

VIOLATIONS=0

# 1. Find new SQL migrations (comparing against main)
BASE_REF=${GITHUB_BASE_REF:-"main"}
NEW_MIGRATIONS=$(git diff --name-only "origin/${BASE_REF}" -- "${MIGRATIONS_DIR}" | grep "\.sql$" | grep -v "\.rollback\.sql$" || true)

if [[ -z "$NEW_MIGRATIONS" ]]; then
    log_info "No new SQL migrations detected."
    exit 0
fi

for migration in $NEW_MIGRATIONS; do
    migration_path="${REPO_ROOT}/${migration}"
    rollback_path="${migration_path%.sql}.rollback.sql"
    
    log_info "Validating migration: $migration"
    
    # 1. Check for rollback script
    if [[ ! -f "$rollback_path" ]]; then
        log_error "VIOLATION: Missing rollback script for $migration"
        log_error "  Expected: ${rollback_path#$REPO_ROOT/}"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
    
    # 2. Check for dangerous locks (Lock-time budget)
    # ACCESS EXCLUSIVE locks block all reads and writes
    if grep -riE "LOCK TABLE|ACCESS EXCLUSIVE" "$migration_path" > /dev/null; then
        log_warn "WARNING: Migration $migration contains explicit LOCK or ACCESS EXCLUSIVE. Ensure it fits in the lock-time budget (default 10s)."
    fi
    
    # 3. Check for ALTER TABLE on potentially large tables without CONCURRENTLY (if index)
    if grep -iE "CREATE INDEX" "$migration_path" | grep -iv "CONCURRENTLY" > /dev/null; then
        log_warn "WARNING: CREATE INDEX found without CONCURRENTLY in $migration."
    fi

    # 4. Check for transaction wrapping (Postgres migrations should usually be in a transaction)
    if ! grep -iE "BEGIN;|START TRANSACTION;" "$migration_path" > /dev/null; then
        log_warn "WARNING: No 'BEGIN;' found in $migration. Ensure transactionality."
    fi
done

if [[ $VIOLATIONS -gt 0 ]]; then
    log_error "Total $VIOLATIONS migration guardrail violations found."
    exit 1
fi

log_info "✅ All new migrations passed guardrail validation."
exit 0

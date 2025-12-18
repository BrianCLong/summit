#!/usr/bin/env bash
set -e

# scripts/migration-gate.sh
# Enforces safety checks on schema migrations before allowing deployment.

echo "🔒 Verifying schema migration safety..."

MIGRATIONS_DIR="server/db/migrations/postgres"

# 1. Check for destructive SQL
echo "Checking for destructive SQL..."
node scripts/check-destructive-sql.cjs "$MIGRATIONS_DIR"

# 2. Check migration plan safety (locks, etc.)
echo "Checking migration plan safety..."
node scripts/check-migration-plan.cjs "$MIGRATIONS_DIR"

# 3. Enforce Rollback Scripts
echo "Verifying rollback scripts..."
node scripts/check-rollbacks.cjs "$MIGRATIONS_DIR"

# 4. (Optional) Dry-run logic could be added here
# echo "Running migration dry-run..."
# ...

echo "✅ Migration gate checks passed."
exit 0

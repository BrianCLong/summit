#!/bin/bash
# Migration Gate Check
# Detects schema/migration changes and requires migration plan

set -euo pipefail

echo "=== Migration Gate Check ==="

# Detect migration file changes
MIGRATION_FILES=$(git diff --name-only origin/main...HEAD 2>/dev/null | grep -E "(migrations/|schema\.sql|\.prisma|db/)" || true)

if [ -z "$MIGRATION_FILES" ]; then
  echo "✅ No migration files changed"
  exit 0
fi

echo "⚠️  Migration files changed:"
echo "$MIGRATION_FILES"
echo ""

# Check for migration plan
if [ -f "MIGRATION_PLAN.md" ] || [ -f ".github/MIGRATION_PLAN.md" ] || [ -f "docs/MIGRATION_PLAN.md" ]; then
  echo "✅ Migration plan found"
  echo "Migration changes detected but documented in MIGRATION_PLAN.md"
  exit 0
fi

# Check for migration plan in PR body (if GitHub context available)
if [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "$GITHUB_EVENT_PATH" ]; then
  PR_BODY=$(jq -r '.pull_request.body // ""' "$GITHUB_EVENT_PATH")
  if echo "$PR_BODY" | grep -qi "migration plan\|schema change\|database change"; then
    echo "✅ Migration plan found in PR description"
    exit 0
  fi
fi

# FAIL: Migration changes without plan
echo "::error::Migration files changed but no MIGRATION_PLAN.md found"
echo "::error::Database schema changes require a migration plan documenting:"
echo "::error::  1. What tables/columns are changing"
echo "::error::  2. Backward compatibility strategy"
echo "::error::  3. Rollback procedure"
echo "::error::  4. Data migration steps (if any)"
echo "::error::"
echo "::error::Create MIGRATION_PLAN.md in the repository root or add 'Migration Plan' section to PR description"
exit 1

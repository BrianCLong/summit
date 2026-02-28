#!/bin/bash
set -euo pipefail

# summit-git-audit.sh
# Objective: Verify git integrity and prevent CI death-spirals.

echo "🔍 Auditing Git Integrity for Summit..."

# 1. Check .gitmodules vs Index
if [ -f .gitmodules ]; then
  echo "📡 Checking .gitmodules entries..."
  SUBMODULE_PATHS=$(git config --file .gitmodules --get-regexp path | awk '{ print $2 }')
  for p in $SUBMODULE_PATHS; do
    if [ ! -d "$p" ]; then
      echo "❌ ERROR: Submodule path '$p' defined in .gitmodules does not exist in the working tree."
      exit 1
    fi
    if ! git ls-files --error-unmatch "$p" > /dev/null 2>&1; then
      echo "❌ ERROR: Submodule path '$p' is in .gitmodules but not in the git index."
      exit 1
    fi
  done
  echo "✅ Submodules appear consistent."
else
  echo "ℹ️ No .gitmodules found; skipping submodule check."
fi

# 2. Check for leaked worktrees
echo "🧹 Checking for leaked worktree references..."
LEAKS=$(git ls-files | grep -E "\.worktrees/|_worktrees/" || true)
if [ -n "$LEAKS" ]; then
  echo "❌ ERROR: Leaked worktree files detected in git index:"
  echo "$LEAKS"
  exit 1
fi
echo "✅ No worktree leaks found."

# 3. Check for leftover lock files
echo "🔒 Checking for stale git locks..."
LOCKS=$(find .git -name "*.lock" || true)
if [ -n "$LOCKS" ]; then
  echo "⚠️ WARNING: Stale git lock files found:"
  echo "$LOCKS"
fi

echo "✨ Git integrity audit passed!"
exit 0

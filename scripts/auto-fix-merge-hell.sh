#!/usr/bin/env bash
set -euo pipefail

# AUTO-FIX MERGE HELL
# Wrapper script to aggressively normalize a PR and fix lockfile conflicts.
# Usage: scripts/auto-fix-merge-hell.sh <PR_NUMBER>

PR="${1:-}"

if [ -z "$PR" ]; then
  echo "Usage: $0 <PR_NUMBER>"
  echo "Example: $0 123"
  exit 1
fi

echo "🚑 Starting Auto-Fix Merge Hell for PR #$PR"

# 1. Checkout the PR
echo "Step 1: Checking out PR..."
gh pr checkout "$PR"

# 2. Attempt Rebase
echo "Step 2: Attempting rebase on main..."
if git rebase origin/main; then
  echo "✅ Rebase clean."
else
  echo "⚠️  Rebase conflict detected."

  # 3. Analyze Conflicts
  CONFLICTS=$(git diff --name-only --diff-filter=U)
  NON_LOCKFILE_CONFLICTS=0

  for file in $CONFLICTS; do
    if [[ "$file" == *"package-lock.json"* ]] || [[ "$file" == *"pnpm-lock.yaml"* ]] || [[ "$file" == *"yarn.lock"* ]]; then
      echo "   Found conflicted lockfile: $file"
    else
      echo "   ❌ Unknown conflict in $file. Cannot auto-fix."
      NON_LOCKFILE_CONFLICTS=1
    fi
  done

  if [ "$NON_LOCKFILE_CONFLICTS" -eq 1 ]; then
    echo "🚨 Manual intervention required for non-lockfile conflicts."
    git rebase --abort
    exit 1
  fi

  # 4. Resolve Lockfile Conflicts (Delete and Regenerate)
  echo "Step 3: Resolving lockfile conflicts by regeneration..."

  for file in $CONFLICTS; do
    echo "   🗑️  Trashing conflicted lockfile $file..."
    # We checkout 'ours' to be safe, then delete.
    # But crucially, we must git add the deletion to resolve the conflict state in the index.
    git checkout --ours "$file" 2>/dev/null || true
    rm -f "$file"
    git add "$file" # Resolve in index (as deleted)
  done

  # Now check if index is clean (it should be, if only lockfiles were conflicted)
  UNMERGED=$(git diff --name-only --diff-filter=U)
  if [ -n "$UNMERGED" ]; then
     echo "🚨 Unexpected unmerged files: $UNMERGED"
     git rebase --abort
     exit 1
  fi

  echo "Step 4: Regenerating lockfiles..."
  if [ -f "pnpm-workspace.yaml" ] || [ -f "pnpm-lock.yaml" ]; then
    # Ensure pnpm is available
    if ! command -v pnpm &> /dev/null; then
        npm install -g pnpm
    fi
    pnpm install --no-frozen-lockfile
    git add pnpm-lock.yaml
  elif [ -f "package-lock.json" ]; then
    npm install
    git add package-lock.json
  elif [ -f "yarn.lock" ]; then
    yarn install
    git add yarn.lock
  fi

  # Continue rebase
  # Git might complain if there are no changes left after resolving.
  git rebase --continue || echo "Rebase continued (no other changes)."
fi

# 5. Final Polish (Regenerate lockfiles to be sure)
echo "Step 5: Ensuring lockfiles are pristine..."

if [ -f "pnpm-lock.yaml" ]; then
    pnpm install --lockfile-only
    git add pnpm-lock.yaml
elif [ -f "package-lock.json" ]; then
    npm install --package-lock-only
    git add package-lock.json
fi

# Check if there are changes to commit
if ! git diff --cached --quiet; then
  git commit --amend --no-edit || git commit -m "chore: regenerate lockfiles"
fi

# 6. Push
echo "Step 6: Pushing changes..."
git push --force-with-lease

echo "✅ PR #$PR has been normalized and pushed."

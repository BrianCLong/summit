#!/usr/bin/env bash
set -euo pipefail

# NORMALIZE BRANCHES
# Scans open PRs and ensures they are up-to-date with main.
# Triggers the auto-fix script if they are behind.

# Safety: Copy scripts to a temp dir so we don't lose them when checking out PRs
SCRIPTS_DIR=$(mktemp -d)
cp -r scripts/* "$SCRIPTS_DIR/"
chmod +x "$SCRIPTS_DIR/"*.sh
chmod +x "$SCRIPTS_DIR/"*.js

echo "🔍 Scanning PRs for normalization..."

# Get PRs that are not "clean" or are behind
PRS=$(gh pr list --state open --limit 10 --json number,headRefName,mergeable,baseRefName)

echo "$PRS" | jq -c '.[]' | while read -r pr_json; do
  PR_NUM=$(echo "$pr_json" | jq -r '.number')
  BRANCH=$(echo "$pr_json" | jq -r '.headRefName')
  MERGEABLE=$(echo "$pr_json" | jq -r '.mergeable')
  BASE=$(echo "$pr_json" | jq -r '.baseRefName')

  echo "Checking PR #$PR_NUM ($BRANCH)..."

  # Check if behind main
  git fetch origin "$BASE" "$BRANCH"

  BEHIND_COUNT=$(git rev-list --count "origin/$BRANCH..origin/$BASE")

  if [ "$BEHIND_COUNT" -gt 0 ]; then
    echo "   📉 Branch is $BEHIND_COUNT commits behind $BASE."
    echo "   🔄 Normalizing..."
    "$SCRIPTS_DIR/auto-fix-merge-hell.sh" "$PR_NUM"
  else
    echo "   ✨ Up to date."
  fi

  if [ "$MERGEABLE" == "CONFLICTING" ]; then
     echo "   ⚔️  Has conflicts. Attempting resolution..."
     "$SCRIPTS_DIR/auto-fix-merge-hell.sh" "$PR_NUM"
  fi

done

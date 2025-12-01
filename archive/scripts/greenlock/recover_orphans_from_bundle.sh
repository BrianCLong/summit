#!/usr/bin/env bash
# Recover all 799 dangling commits as rescue/* branches

set -euo pipefail

LEDGER_DIR="${LEDGER_DIR:-./green-lock-ledger}"
DANGLING="${LEDGER_DIR}/dangling_commits.txt"
BUNDLE="${LEDGER_DIR}/summit-ALL.bundle"

if [ ! -f "$DANGLING" ]; then
  echo "❌ Dangling commits file not found: $DANGLING"
  echo "   Run: make capture"
  exit 1
fi

if [ ! -f "$BUNDLE" ]; then
  echo "❌ Bundle not found: $BUNDLE"
  echo "   Run: make capture"
  exit 1
fi

total=$(wc -l < "$DANGLING")
echo "======================================================================"
echo "  RECOVERING ${total} ORPHANED COMMITS"
echo "======================================================================"
echo ""
echo "Creating rescue/* branches from dangling commits..."
echo ""

count=0
while IFS= read -r sha; do
  # Skip empty lines
  [ -z "$sha" ] && continue

  ((count++))
  branch_name="rescue/${sha}"

  # Check if commit exists in bundle
  if git cat-file -t "$sha" >/dev/null 2>&1; then
    # Create branch from commit
    if git branch "$branch_name" "$sha" 2>/dev/null; then
      echo "  [$count/$total] ✓ Created: $branch_name"
    else
      # Branch might already exist
      echo "  [$count/$total] - Exists: $branch_name"
    fi
  else
    echo "  [$count/$total] ⚠ Commit not found: $sha (may need bundle restore)"
  fi

  # Progress update every 50 commits
  if [ $((count % 50)) -eq 0 ]; then
    echo ""
    echo "  Progress: $count/$total commits processed..."
    echo ""
  fi
done < "$DANGLING"

echo ""
echo "======================================================================"
echo "  ORPHAN RECOVERY COMPLETE"
echo "======================================================================"
echo "  Total commits processed: $count"
echo "  Branches created: rescue/*"
echo ""
echo "To view rescued branches:"
echo "  git branch | grep rescue/"
echo ""
echo "To push rescued branches:"
echo "  git push origin 'rescue/*'"
echo ""
echo "To review a specific rescue:"
echo "  git log rescue/<sha> --oneline -20"
echo "  git show rescue/<sha>"
echo ""

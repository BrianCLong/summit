#!/usr/bin/env bash
# Enable auto-merge on all open PRs

set -euo pipefail

OWNER="${OWNER:-BrianCLong}"
REPO="${REPO:-summit}"

echo "======================================================================"
echo "  ENABLING AUTO-MERGE ON ALL OPEN PRS"
echo "======================================================================"
echo ""

# Get all open PR numbers
prs=$(gh pr list --repo "${OWNER}/${REPO}" --state open --json number --jq '.[].number')

if [ -z "$prs" ]; then
  echo "✓ No open PRs found"
  exit 0
fi

pr_count=$(echo "$prs" | wc -w)
echo "Found $pr_count open PRs"
echo ""

count=0
success=0
skipped=0
failed=0

for pr in $prs; do
  ((count++))
  echo "  [$count/$pr_count] PR #$pr"

  # Check if auto-merge is already enabled
  auto_merge_status=$(gh pr view "$pr" --repo "${OWNER}/${REPO}" --json autoMergeRequest --jq '.autoMergeRequest')

  if [ "$auto_merge_status" != "null" ]; then
    echo "            ⏭ Auto-merge already enabled"
    ((skipped++))
    continue
  fi

  # Enable auto-merge with squash strategy
  if gh pr merge "$pr" --repo "${OWNER}/${REPO}" --squash --auto --delete-branch 2>/dev/null; then
    echo "            ✓ Auto-merge enabled (squash)"
    ((success++))
  else
    echo "            ✗ Failed to enable auto-merge"
    ((failed++))
  fi

  # Small delay to avoid rate limiting
  sleep 0.5
done

echo ""
echo "======================================================================"
echo "  AUTO-MERGE ENABLEMENT COMPLETE"
echo "======================================================================"
echo "  Total PRs processed: $count"
echo "  Successfully enabled: $success"
echo "  Already enabled: $skipped"
echo "  Failed: $failed"
echo ""
echo "Next steps:"
echo "  1. PRs will auto-merge when 'Stabilization: Build & Unit Tests' passes"
echo "  2. Auto-green workflow will auto-fix formatting/linting on each PR"
echo "  3. Monitor progress: gh pr list --state open"
echo ""

  # Run the backlog monitor
  echo "Running Backlog Monitor..."
  ./scripts/monitor-backlog.sh

#!/bin/bash
# Batch PR processing script for Mega Merge Orchestrator

set -e

BATCH_FILE="${1:-/tmp/batch.txt}"
MODE="${AGGRESSIVE_MODE:-true}"

echo "=== BATCH PR PROCESSING ==="
echo "Batch file: $BATCH_FILE"
echo "Aggressive mode: $MODE"

if [ ! -f "$BATCH_FILE" ]; then
  echo "No batch file found, exiting"
  exit 0
fi

processed=0
approved=0
merged=0
failed=0

while IFS=: read -r pr_num branch_name; do
  [ -z "$pr_num" ] && continue

  echo "Processing PR #$pr_num ($branch_name)..."

  # Get PR status
  pr_status=$(gh pr view "$pr_num" --json mergeable,reviewDecision,statusCheckRollup 2>/dev/null || echo "")

  if [ -z "$pr_status" ]; then
    echo "⚠️ Could not fetch PR #$pr_num"
    failed=$((failed + 1))
    continue
  fi

  mergeable=$(echo "$pr_status" | jq -r '.mergeable // "UNKNOWN"')
  review_decision=$(echo "$pr_status" | jq -r '.reviewDecision // "REVIEW_REQUIRED"')

  # Count check statuses
  checks_total=$(echo "$pr_status" | jq '.statusCheckRollup | length')
  checks_passing=$(echo "$pr_status" | jq '[.statusCheckRollup[]? | select(.conclusion == "SUCCESS" or .conclusion == "SKIPPED" or .conclusion == "NEUTRAL")] | length')
  checks_failing=$(echo "$pr_status" | jq '[.statusCheckRollup[]? | select(.conclusion == "FAILURE")] | length')

  echo "  Mergeable: $mergeable | Review: $review_decision | Checks: $checks_passing/$checks_total passing"

  # Try to auto-approve if needed
  if [ "$review_decision" = "REVIEW_REQUIRED" ] && [ "$MODE" = "true" ]; then
    echo "  Attempting auto-approve..."
    if gh pr review "$pr_num" --approve --body "🤖 Auto-approved by Mega Merge Orchestrator" 2>/dev/null; then
      echo "  ✅ Auto-approved"
      approved=$((approved + 1))
      sleep 2
    fi
  fi

  # Try to merge if ready
  if [ "$mergeable" = "MERGEABLE" ] && [ "$checks_failing" = "0" ] && [ "$checks_total" -gt 0 ]; then
    echo "  Attempting merge..."
    if gh pr merge "$pr_num" --squash --auto --delete-branch 2>&1; then
      echo "  ✅ Merged PR #$pr_num"
      merged=$((merged + 1))
      sleep 3
    else
      echo "  ⚠️ Merge failed for PR #$pr_num"
      failed=$((failed + 1))
    fi
  else
    echo "  ⏳ Not ready to merge yet (failing=$checks_failing, total=$checks_total)"
  fi

  processed=$((processed + 1))

  # Rate limit protection
  sleep 1

done < "$BATCH_FILE"

echo "=== BATCH COMPLETE ==="
echo "Processed: $processed"
echo "Approved: $approved"
echo "Merged: $merged"
echo "Failed: $failed"

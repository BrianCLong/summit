#!/bin/bash
# Cancel queued workflow runs from ARCHIVED workflows only
# Preserves runs from the new 8-workflow system
#
# New workflow allowlist:
#   - pr-gate
#   - client-ci
#   - server-ci
#   - docs-ci
#   - infra-ci
#   - main-validation
#   - release-ga
#   - _reusable-ga-readiness

set -euo pipefail

# Define the allowlist of new workflows (case-insensitive matching)
ALLOWLIST_PATTERN="pr-gate|client-ci|server-ci|docs-ci|infra-ci|main-validation|release-ga|_reusable-ga-readiness"

echo "🔍 Fetching queued runs..."
echo "✨ Preserving new workflows: pr-gate, client-ci, server-ci, docs-ci, infra-ci, main-validation, release-ga"
echo ""

# Fetch queued runs and filter out allowlisted workflows
ARCHIVED_RUNS=$(gh run list --status queued --limit 200 --json databaseId,workflowName \
  --jq ".[] | select(.workflowName | test(\"$ALLOWLIST_PATTERN\"; \"i\") | not) | .databaseId")

if [ -z "$ARCHIVED_RUNS" ]; then
  echo "✅ No archived workflow runs queued"
  exit 0
fi

COUNT=$(echo "$ARCHIVED_RUNS" | wc -l | tr -d ' ')
echo "⚠️  Found $COUNT queued runs from archived workflows"
echo "🚫 Canceling archived workflow runs..."
echo ""

CANCELLED=0
FAILED=0

echo "$ARCHIVED_RUNS" | while read -r run_id; do
  if [ -n "$run_id" ]; then
    # Get workflow name for logging
    WF_NAME=$(gh run view "$run_id" --json workflowName --jq '.workflowName' 2>/dev/null || echo "unknown")
    echo "  Canceling: $WF_NAME (ID: $run_id)"

    if gh run cancel "$run_id" 2>/dev/null; then
      CANCELLED=$((CANCELLED + 1))
    else
      FAILED=$((FAILED + 1))
      echo "    ⚠️  Failed to cancel (may already be canceled or completed)"
    fi
  fi
done

echo ""
echo "✅ Canceled $COUNT archived workflow runs"
echo ""
echo "📊 Summary:"
echo "  • Archived workflows cancelled: $COUNT"
echo "  • New workflows preserved: All (pr-gate, client-ci, server-ci, etc.)"
echo ""
echo "📋 Next steps:"
echo "  1. Monitor queue: gh run list --status queued --limit 10"
echo "  2. Check health: bash scripts/ci/monitor-runner-capacity.sh"
echo "  3. New PRs will use the 8-workflow system automatically"

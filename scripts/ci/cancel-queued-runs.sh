#!/bin/bash
# Cancel all queued workflow runs to clear the backlog
# This allows MERGE_SURGE mode to take effect on fresh runs

set -euo pipefail

echo "🔍 Fetching queued runs..."
QUEUED_RUNS=$(gh run list --status queued --limit 200 --json databaseId,workflowName,createdAt --jq '.[] | .databaseId')

if [ -z "$QUEUED_RUNS" ]; then
  echo "✅ No queued runs to cancel"
  exit 0
fi

COUNT=$(echo "$QUEUED_RUNS" | wc -l | tr -d ' ')
echo "⚠️  Found $COUNT queued runs"
echo "🚫 Canceling all queued runs..."

echo "$QUEUED_RUNS" | while read -r run_id; do
  if [ -n "$run_id" ]; then
    echo "  Canceling run $run_id..."
    gh run cancel "$run_id" 2>/dev/null || echo "    Failed to cancel $run_id (may already be canceled)"
  fi
done

echo "✅ Canceled $COUNT queued runs"
echo ""
echo "📋 Next steps:"
echo "  1. MERGE_SURGE mode is now enabled (skips heavy jobs)"
echo "  2. PRs with auto-merge will re-trigger automatically"
echo "  3. Monitor with: gh run list --status queued"

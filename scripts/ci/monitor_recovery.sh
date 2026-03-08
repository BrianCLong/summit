#!/bin/bash
# Monitor Merge Train Recovery Progress
#
# Tracks recovery metrics and alerts when manual actions are complete
#
# Usage: bash scripts/ci/monitor_recovery.sh

set -euo pipefail

echo "═══════════════════════════════════════"
echo "   Merge Train Recovery Monitor"
echo "═══════════════════════════════════════"
echo ""
date
echo ""

# Check branch protection status
echo "🔒 Branch Protection Status:"
REQUIRED_CHECKS=$(gh api repos/BrianCLong/summit/branches/main --jq '.protection.required_status_checks.contexts | length' 2>/dev/null || echo "unknown")
echo "  Required checks: $REQUIRED_CHECKS"

if [ "$REQUIRED_CHECKS" -le 3 ] 2>/dev/null; then
  echo "  ✅ MANUAL UPDATE COMPLETE (reduced to $REQUIRED_CHECKS checks)"
  PROTECTION_STATUS="UPDATED"
elif [ "$REQUIRED_CHECKS" == "unknown" ]; then
  echo "  ⚠️  Cannot read branch protection (check permissions)"
  PROTECTION_STATUS="UNKNOWN"
else
  echo "  ⏳ AWAITING MANUAL UPDATE (currently $REQUIRED_CHECKS checks, target: 3)"
  PROTECTION_STATUS="PENDING"
fi

echo ""

# Check queue depth
echo "📊 Queue Metrics:"
QUEUED=$(gh run list --status queued --limit 300 --json databaseId 2>/dev/null | jq 'length')
IN_PROGRESS=$(gh run list --status in_progress --limit 200 --json databaseId 2>/dev/null | jq 'length')
echo "  Queued: $QUEUED"
echo "  In Progress: $IN_PROGRESS"

if [ "$QUEUED" -lt 100 ]; then
  echo "  ✅ Queue clearing (target: <50)"
  QUEUE_STATUS="IMPROVING"
elif [ "$QUEUED" -lt 200 ]; then
  echo "  ⚠️  Queue elevated (target: <50)"
  QUEUE_STATUS="WARNING"
else
  echo "  ❌ Queue saturated (target: <50)"
  QUEUE_STATUS="CRITICAL"
fi

echo ""

# Check stabilization PRs
echo "🚀 Stabilization PRs:"
for pr in 19069 19070 19071 19072; do
  PR_STATE=$(gh pr view $pr --json state,mergeable --jq '.state + " / " + .mergeable' 2>/dev/null || echo "ERROR")
  echo "  PR #$pr: $PR_STATE"
done

echo ""

# Count merged stabilization PRs
MERGED_COUNT=$(gh pr list --search "is:merged author:@me 19069 19070 19071 19072" --json number 2>/dev/null | jq 'length')
echo "  Merged: $MERGED_COUNT / 4"

if [ "$MERGED_COUNT" -eq 4 ]; then
  echo "  ✅ ALL STABILIZATION PRS MERGED - READY FOR FINAL ACTIVATION"
  STABILIZATION_STATUS="COMPLETE"
elif [ "$MERGED_COUNT" -gt 0 ]; then
  echo "  ⏳ Partial merge progress"
  STABILIZATION_STATUS="IN_PROGRESS"
else
  echo "  ⏳ Awaiting PR merges"
  STABILIZATION_STATUS="PENDING"
fi

echo ""
echo "═══════════════════════════════════════"
echo "   Status Summary"
echo "═══════════════════════════════════════"
echo "Protection: $PROTECTION_STATUS"
echo "Queue: $QUEUE_STATUS"
echo "Stabilization: $STABILIZATION_STATUS"
echo ""

# Determine next action
if [ "$PROTECTION_STATUS" == "PENDING" ]; then
  echo "⏳ NEXT ACTION: User must update branch protection"
  echo "   See: docs/ci/IMMEDIATE-ACTION-REQUIRED.md"
  echo ""
  exit 1
elif [ "$PROTECTION_STATUS" == "UPDATED" ] && [ "$STABILIZATION_STATUS" == "PENDING" ]; then
  echo "⏳ NEXT ACTION: Wait for stabilization PRs to merge (1-2 hours)"
  echo "   Monitor: gh pr list --search \"19069 19070 19071 19072\""
  echo ""
  exit 0
elif [ "$STABILIZATION_STATUS" == "COMPLETE" ]; then
  echo "✅ NEXT ACTION: Final activation"
  echo "   1. Update branch protection (require only pr-gate)"
  echo "   2. Run: bash scripts/ci/workflow_registry_cleanup.sh"
  echo "   3. Run: node scripts/ci/ci_metrics.mjs --save"
  echo ""
  exit 0
else
  echo "⏳ NEXT ACTION: Continue monitoring"
  echo "   Re-run this script in 15 minutes"
  echo ""
  exit 0
fi

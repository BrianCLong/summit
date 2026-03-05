#!/usr/bin/env bash
set -euo pipefail

# Observer script for Deterministic Merge Train
# Telemetry script that continuously monitors the merge-train for CI queue pressure,
# required-check drift, and 'green-but-stuck' PRs, outputting deterministic reports to disk.

REPO="BrianCLong/summit"
OUTPUT_DIR="soc-compliance-reports"
OUTPUT_FILE="${OUTPUT_DIR}/merge-train-report.json"
mkdir -p "$OUTPUT_DIR"

echo "📡 Observer: Fetching merge train telemetry..."

# Count PRs in each lane
MERGE_NOW=$(gh pr list --repo "$REPO" --state open --label "queue:merge-now" --json number | jq 'length')
NEEDS_REBASE=$(gh pr list --repo "$REPO" --state open --label "queue:needs-rebase" --json number | jq 'length')
CONFLICT=$(gh pr list --repo "$REPO" --state open --label "queue:conflict" --json number | jq 'length')
BLOCKED=$(gh pr list --repo "$REPO" --state open --label "queue:blocked" --json number | jq 'length')
OBSOLETE=$(gh pr list --repo "$REPO" --state open --label "queue:obsolete" --json number | jq 'length')

TOTAL_OPEN=$(gh pr list --repo "$REPO" --state open --json number | jq 'length')

# Look for 'green-but-stuck' PRs (no labels but successful)
GREEN_STUCK=$(gh pr list --repo "$REPO" --state open --search "status:success -label:queue:merge-now -label:queue:blocked -label:queue:conflict" --json number | jq 'length')

# Check CI queue pressure (approximate via queued workflow runs)
QUEUED_CI_RUNS=$(gh run list --repo "$REPO" --status queued --json id | jq 'length')

# Deterministic report creation without dynamic timestamps
cat <<JSON > "$OUTPUT_FILE"
{
  "queue_pressure": {
    "total_open": $TOTAL_OPEN,
    "merge_now": $MERGE_NOW,
    "needs_rebase": $NEEDS_REBASE,
    "conflict": $CONFLICT,
    "blocked": $BLOCKED,
    "obsolete": $OBSOLETE,
    "green_but_stuck": $GREEN_STUCK
  },
  "ci_health": {
    "queued_runs": $QUEUED_CI_RUNS
  },
  "observer_status": "healthy"
}
JSON

echo "✅ Observer report generated at $OUTPUT_FILE"

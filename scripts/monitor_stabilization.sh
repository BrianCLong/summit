#!/usr/bin/env bash
# Monitor stabilization workflow execution on new commits

set -euo pipefail

OWNER="${OWNER:-BrianCLong}"
REPO="${REPO:-summit}"
WORKFLOW_NAME="Stabilization: Build & Unit Tests"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"  # seconds

echo "======================================================================"
echo "  STABILIZATION WORKFLOW MONITOR"
echo "======================================================================"
echo "  Repository: ${OWNER}/${REPO}"
echo "  Workflow: ${WORKFLOW_NAME}"
echo "  Check interval: ${CHECK_INTERVAL}s"
echo "======================================================================"
echo ""

while true; do
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] Checking workflow status..."

  # Get recent workflow runs
  runs=$(gh run list \
    --repo "${OWNER}/${REPO}" \
    --workflow "${WORKFLOW_NAME}" \
    --limit 5 \
    --json conclusion,status,createdAt,headBranch,event \
    --jq '.[] | "\(.status)|\(.conclusion // "running")|\(.createdAt)|\(.headBranch)|\(.event)"')

  if [ -z "$runs" ]; then
    echo "  No recent workflow runs found"
  else
    echo ""
    echo "  Recent workflow runs:"
    echo "  ──────────────────────────────────────────────────────────────"
    printf "  %-15s %-12s %-20s %-15s\n" "STATUS" "BRANCH" "TIME" "EVENT"
    echo "  ──────────────────────────────────────────────────────────────"

    while IFS='|' read -r status conclusion created_at branch event; do
      # Format timestamp
      time_ago=$(ruby -e "require 'time'; puts((Time.now - Time.parse('$created_at')).to_i / 60)") 2>/dev/null || echo "?"
      time_display="${time_ago}m ago"

      # Determine display status
      if [ "$status" = "completed" ]; then
        case "$conclusion" in
          success)
            display_status="✓ SUCCESS"
            ;;
          failure)
            display_status="✗ FAILURE"
            ;;
          cancelled)
            display_status="⊘ CANCELLED"
            ;;
          *)
            display_status="? $conclusion"
            ;;
        esac
      else
        display_status="⟳ $status"
      fi

      # Truncate branch name if too long
      if [ ${#branch} -gt 12 ]; then
        branch="${branch:0:9}..."
      fi

      printf "  %-15s %-12s %-20s %-15s\n" "$display_status" "$branch" "$time_display" "$event"
    done <<< "$runs"

    echo "  ──────────────────────────────────────────────────────────────"
  fi

  echo ""
  echo "  Press Ctrl+C to stop monitoring"
  echo ""

  # Wait for next check
  sleep "$CHECK_INTERVAL"
done

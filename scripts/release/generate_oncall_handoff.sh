#!/usr/bin/env bash
# generate_oncall_handoff.sh
#
# Generates a concise, actionable on-call handoff note for release operations
# shift transitions. Designed to be copy-pasteable into Slack, email, or GitHub.
#
# Usage:
#   ./scripts/release/generate_oncall_handoff.sh [OPTIONS]
#
# Options:
#   --policy <path>     Path to policy file (default: docs/ci/ONCALL_HANDOFF_POLICY.yml)
#   --state <path>      Path to state file (default: docs/releases/_state/handoff_state.json)
#   --out <path>        Output path for handoff note
#   --slack-out <path>  Output path for Slack-formatted note
#   --shift <name>      Force specific shift (emea, americas, apac)
#   --context <text>    Additional context to include
#   --dry-run           Generate without updating state
#   --help              Show this help message
#
# See docs/ci/ONCALL_HANDOFF.md for full documentation.

set -euo pipefail

# Default paths
POLICY_FILE="docs/ci/ONCALL_HANDOFF_POLICY.yml"
STATE_FILE="docs/releases/_state/handoff_state.json"
OUTPUT_FILE=""
SLACK_OUTPUT_FILE=""
FORCED_SHIFT=""
ADDITIONAL_CONTEXT=""
DRY_RUN=false

# Repository info
REPO="${GITHUB_REPOSITORY:-$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\(.*\)\.git/\1/' || echo 'unknown/repo')}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --policy)
      POLICY_FILE="$2"
      shift 2
      ;;
    --state)
      STATE_FILE="$2"
      shift 2
      ;;
    --out)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --slack-out)
      SLACK_OUTPUT_FILE="$2"
      shift 2
      ;;
    --shift)
      FORCED_SHIFT="$2"
      shift 2
      ;;
    --context)
      ADDITIONAL_CONTEXT="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      head -30 "$0" | tail -25
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Ensure output directory exists
if [[ -n "$OUTPUT_FILE" ]]; then
  mkdir -p "$(dirname "$OUTPUT_FILE")"
fi
if [[ -n "$SLACK_OUTPUT_FILE" ]]; then
  mkdir -p "$(dirname "$SLACK_OUTPUT_FILE")"
fi

# Default output paths from policy if not specified
if [[ -z "$OUTPUT_FILE" ]]; then
  OUTPUT_FILE="artifacts/release-train/oncall_handoff.md"
  mkdir -p "$(dirname "$OUTPUT_FILE")"
fi

# Determine current shift based on UTC time
get_current_shift() {
  local hour
  hour=$(date -u +%H)

  if [[ $hour -ge 0 && $hour -lt 8 ]]; then
    echo "apac"
  elif [[ $hour -ge 8 && $hour -lt 16 ]]; then
    echo "emea"
  else
    echo "americas"
  fi
}

# Determine next shift
get_next_shift() {
  local current="$1"
  case "$current" in
    apac) echo "emea" ;;
    emea) echo "americas" ;;
    americas) echo "apac" ;;
    *) echo "unknown" ;;
  esac
}

# Get shift display name
get_shift_name() {
  local shift="$1"
  case "$shift" in
    apac) echo "APAC" ;;
    emea) echo "EMEA" ;;
    americas) echo "Americas" ;;
    *) echo "Unknown" ;;
  esac
}

# Fetch open blockers from GitHub
fetch_blockers() {
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "[]"
    return
  fi

  gh issue list \
    --repo "$REPO" \
    --label "release-blocker" \
    --state open \
    --json number,title,labels,createdAt,url \
    --limit 20 2>/dev/null || echo "[]"
}

# Fetch recent workflow runs
fetch_recent_runs() {
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "[]"
    return
  fi

  gh run list \
    --repo "$REPO" \
    --limit 10 \
    --json databaseId,name,status,conclusion,createdAt,headBranch \
    2>/dev/null || echo "[]"
}

# Fetch escalated issues
fetch_escalations() {
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "[]"
    return
  fi

  gh issue list \
    --repo "$REPO" \
    --label "escalation:P0" \
    --state open \
    --json number,title,labels,createdAt,url \
    --limit 10 2>/dev/null || echo "[]"
}

# Calculate age string
calc_age() {
  local created_at="$1"
  local now_epoch
  local created_epoch
  local diff_minutes

  now_epoch=$(date +%s)
  created_epoch=$(date -d "$created_at" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created_at" +%s 2>/dev/null || echo "$now_epoch")

  diff_minutes=$(( (now_epoch - created_epoch) / 60 ))

  if [[ $diff_minutes -lt 60 ]]; then
    echo "${diff_minutes}m"
  elif [[ $diff_minutes -lt 1440 ]]; then
    echo "$(( diff_minutes / 60 ))h"
  else
    echo "$(( diff_minutes / 1440 ))d"
  fi
}

# Get priority from labels
get_priority() {
  local labels="$1"
  if echo "$labels" | grep -q "severity:P0\|escalation:P0"; then
    echo "P0"
  elif echo "$labels" | grep -q "blocked"; then
    echo "BLOCKED"
  elif echo "$labels" | grep -q "severity:P1\|escalation:P1"; then
    echo "P1"
  else
    echo "P2"
  fi
}

# Get status indicator
get_status_indicator() {
  local count="$1"
  local threshold_warn="${2:-1}"
  local threshold_crit="${3:-3}"

  if [[ $count -eq 0 ]]; then
    echo "[OK]"
  elif [[ $count -lt $threshold_warn ]]; then
    echo "[OK]"
  elif [[ $count -lt $threshold_crit ]]; then
    echo "[WARN]"
  else
    echo "[CRIT]"
  fi
}

# Load previous state
load_state() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE"
  else
    echo '{"version":"1.0.0","last_handoff_at":null,"previous_context":null}'
  fi
}

# Main generation logic
main() {
  local current_shift
  local next_shift
  local now_iso
  local blockers
  local escalations
  local recent_runs

  # Determine shifts
  if [[ -n "$FORCED_SHIFT" ]]; then
    current_shift="$FORCED_SHIFT"
  else
    current_shift=$(get_current_shift)
  fi
  next_shift=$(get_next_shift "$current_shift")

  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  echo "Generating on-call handoff note..." >&2
  echo "  Current shift: $(get_shift_name "$current_shift")" >&2
  echo "  Handing off to: $(get_shift_name "$next_shift")" >&2

  # Fetch data
  blockers=$(fetch_blockers)
  escalations=$(fetch_escalations)
  recent_runs=$(fetch_recent_runs)

  # Parse counts
  local blocker_count
  local p0_count
  local escalation_count
  local failed_runs

  blocker_count=$(echo "$blockers" | jq 'length')
  p0_count=$(echo "$blockers" | jq '[.[] | select(.labels[].name | test("severity:P0|escalation:P0"))] | length')
  escalation_count=$(echo "$escalations" | jq 'length')
  failed_runs=$(echo "$recent_runs" | jq '[.[] | select(.conclusion == "failure")] | length')

  # Load previous context
  local prev_state
  local prev_context
  prev_state=$(load_state)
  prev_context=$(echo "$prev_state" | jq -r '.previous_context // empty')

  # Generate markdown handoff note
  {
    echo "# Release Ops On-Call Handoff"
    echo ""
    echo "**From:** $(get_shift_name "$current_shift") | **To:** $(get_shift_name "$next_shift")"
    echo "**Generated:** $now_iso"
    echo "**Repository:** $REPO"
    echo ""
    echo "---"
    echo ""

    # Quick Status Summary
    echo "## Quick Status"
    echo ""
    local overall_status="OK"
    if [[ $p0_count -gt 0 || $escalation_count -gt 0 ]]; then
      overall_status="CRITICAL"
    elif [[ $blocker_count -gt 0 || $failed_runs -gt 2 ]]; then
      overall_status="WARNING"
    fi

    echo "| Metric | Value | Status |"
    echo "|--------|-------|--------|"
    echo "| Open Blockers | $blocker_count | $(get_status_indicator "$blocker_count" 1 3) |"
    echo "| P0 Critical | $p0_count | $(get_status_indicator "$p0_count" 1 1) |"
    echo "| Active Escalations | $escalation_count | $(get_status_indicator "$escalation_count" 1 2) |"
    echo "| Failed CI Runs | $failed_runs | $(get_status_indicator "$failed_runs" 2 5) |"
    echo ""
    echo "**Overall Status:** $overall_status"
    echo ""

    # Active Blockers (top 5)
    if [[ $blocker_count -gt 0 ]]; then
      echo "---"
      echo ""
      echo "## Active Blockers"
      echo ""
      echo "$blockers" | jq -r '
        sort_by(.createdAt) |
        .[:5] |
        .[] |
        "- [#\(.number)](\(.url)) \(.title | .[0:60])..."
      ' 2>/dev/null || echo "- Unable to fetch blocker details"
      echo ""
    fi

    # Active Escalations
    if [[ $escalation_count -gt 0 ]]; then
      echo "---"
      echo ""
      echo "## Active Escalations (P0)"
      echo ""
      echo "$escalations" | jq -r '
        .[:5] |
        .[] |
        "- [#\(.number)](\(.url)) \(.title | .[0:60])..."
      ' 2>/dev/null || echo "- Unable to fetch escalation details"
      echo ""
    fi

    # Pending Actions
    echo "---"
    echo ""
    echo "## Recommended Actions"
    echo ""

    local action_num=1
    if [[ $p0_count -gt 0 ]]; then
      echo "$action_num. **[URGENT]** Triage $p0_count P0 blocker(s) immediately"
      action_num=$((action_num + 1))
    fi
    if [[ $escalation_count -gt 0 ]]; then
      echo "$action_num. **[URGENT]** Address $escalation_count active escalation(s)"
      action_num=$((action_num + 1))
    fi
    if [[ $failed_runs -gt 0 ]]; then
      echo "$action_num. Review $failed_runs failed CI run(s)"
      action_num=$((action_num + 1))
    fi
    if [[ $blocker_count -gt 0 && $p0_count -eq 0 ]]; then
      echo "$action_num. Monitor $blocker_count open blocker(s)"
      action_num=$((action_num + 1))
    fi
    if [[ $action_num -eq 1 ]]; then
      echo "- No urgent actions required. Continue monitoring."
    fi
    echo ""

    # Previous Context
    if [[ -n "$prev_context" ]]; then
      echo "---"
      echo ""
      echo "## Context from Previous Shift"
      echo ""
      echo "$prev_context"
      echo ""
    fi

    # Additional Context
    if [[ -n "$ADDITIONAL_CONTEXT" ]]; then
      echo "---"
      echo ""
      echo "## Additional Context"
      echo ""
      echo "$ADDITIONAL_CONTEXT"
      echo ""
    fi

    # Links
    echo "---"
    echo ""
    echo "## Quick Links"
    echo ""
    echo "- [Open Blockers](https://github.com/$REPO/issues?q=is%3Aopen+label%3Arelease-blocker)"
    echo "- [CI Runs](https://github.com/$REPO/actions)"
    echo "- [Release Ops Digest](https://github.com/$REPO/actions/workflows/release-ops-digest.yml)"
    echo ""

  } > "$OUTPUT_FILE"

  echo "Generated handoff note: $OUTPUT_FILE" >&2

  # Generate Slack-friendly version
  if [[ -n "$SLACK_OUTPUT_FILE" ]]; then
    {
      echo ":handshake: *Release Ops Handoff: $(get_shift_name "$current_shift") -> $(get_shift_name "$next_shift")*"
      echo "_$(date -u +"%Y-%m-%d %H:%M UTC")_"
      echo ""
      echo "*Quick Status:* $overall_status"
      echo "- Blockers: $blocker_count (P0: $p0_count)"
      echo "- Escalations: $escalation_count"
      echo "- Failed CI: $failed_runs"
      echo ""

      if [[ $p0_count -gt 0 || $escalation_count -gt 0 ]]; then
        echo ":rotating_light: *Urgent Actions:*"
        if [[ $p0_count -gt 0 ]]; then
          echo "- Triage $p0_count P0 blocker(s)"
        fi
        if [[ $escalation_count -gt 0 ]]; then
          echo "- Address $escalation_count escalation(s)"
        fi
        echo ""
      fi

      if [[ $blocker_count -gt 0 ]]; then
        echo "*Top Blockers:*"
        echo "$blockers" | jq -r '
          sort_by(.createdAt) |
          .[:3] |
          .[] |
          "- #\(.number): \(.title | .[0:50])..."
        ' 2>/dev/null || echo "- Unable to fetch"
        echo ""
      fi

      if [[ -n "$ADDITIONAL_CONTEXT" ]]; then
        echo "*Context:* $ADDITIONAL_CONTEXT"
        echo ""
      fi

      echo "<https://github.com/$REPO/issues?q=is%3Aopen+label%3Arelease-blocker|View all blockers>"

    } > "$SLACK_OUTPUT_FILE"

    echo "Generated Slack handoff: $SLACK_OUTPUT_FILE" >&2
  fi

  # Update state (unless dry run)
  if [[ "$DRY_RUN" != "true" ]]; then
    local new_state
    new_state=$(jq -n \
      --arg version "1.0.0" \
      --arg last_handoff_at "$now_iso" \
      --arg last_handoff_shift "$current_shift" \
      --arg previous_context "$ADDITIONAL_CONTEXT" \
      --argjson last_blocker_snapshot "$blockers" \
      '{
        version: $version,
        last_handoff_at: $last_handoff_at,
        last_handoff_shift: $last_handoff_shift,
        previous_context: (if $previous_context == "" then null else $previous_context end),
        last_blocker_snapshot: $last_blocker_snapshot
      }')

    echo "$new_state" > "$STATE_FILE"
    echo "Updated state: $STATE_FILE" >&2
  else
    echo "Dry run: state not updated" >&2
  fi

  echo "Handoff note generation complete!" >&2
}

main "$@"

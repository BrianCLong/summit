#!/usr/bin/env bash
# generate_release_dashboard.sh
#
# Generates a Release Train Dashboard showing the current state of
# all release lines, blockers, CI health, and promotion readiness.
#
# Usage:
#   ./scripts/release/generate_release_dashboard.sh [OPTIONS]
#
# Options:
#   --out <path>        Output path for dashboard (default: artifacts/release-train/dashboard.md)
#   --json <path>       Output path for JSON data (default: artifacts/release-train/dashboard.json)
#   --state <path>      Path to state file (default: docs/releases/_state/dashboard_state.json)
#   --dry-run           Generate without updating state
#   --help              Show this help message
#
# See docs/ci/RELEASE_TRAIN_DASHBOARD.md for full documentation.

set -euo pipefail

# Default paths
OUTPUT_FILE="artifacts/release-train/dashboard.md"
JSON_OUTPUT="artifacts/release-train/dashboard.json"
STATE_FILE="docs/releases/_state/dashboard_state.json"
DRY_RUN=false

# Repository info
REPO="${GITHUB_REPOSITORY:-$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\(.*\)\.git/\1/' || echo 'unknown/repo')}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --out)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --json)
      JSON_OUTPUT="$2"
      shift 2
      ;;
    --state)
      STATE_FILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      head -25 "$0" | tail -20
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Ensure output directories exist
mkdir -p "$(dirname "$OUTPUT_FILE")"
mkdir -p "$(dirname "$JSON_OUTPUT")"
mkdir -p "$(dirname "$STATE_FILE")"

# Initialize state file if needed
if [[ ! -f "$STATE_FILE" ]]; then
  echo '{"version":"1.0.0","last_update":null,"history":[]}' > "$STATE_FILE"
fi

# Get current timestamp
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
NOW_DISPLAY=$(date -u +"%Y-%m-%d %H:%M UTC")

echo "Generating Release Train Dashboard..." >&2
echo "  Output: $OUTPUT_FILE" >&2
echo "  JSON: $JSON_OUTPUT" >&2

# Fetch release tags
fetch_release_tags() {
  git tag -l "v*" --sort=-version:refname 2>/dev/null | head -20 || echo ""
}

# Fetch RC tags
fetch_rc_tags() {
  git tag -l "*-rc.*" --sort=-version:refname 2>/dev/null | head -10 || echo ""
}

# Get latest stable version
get_latest_stable() {
  git tag -l "v[0-9]*.[0-9]*.[0-9]" --sort=-version:refname 2>/dev/null | grep -v "rc\|alpha\|beta\|hotfix" | head -1 || echo "v0.0.0"
}

# Get latest RC version
get_latest_rc() {
  git tag -l "*-rc.*" --sort=-version:refname 2>/dev/null | head -1 || echo "none"
}

# Fetch open blockers
fetch_blockers() {
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "[]"
    return
  fi

  gh issue list \
    --repo "$REPO" \
    --label "release-blocker" \
    --state open \
    --json number,title,labels,createdAt \
    --limit 50 2>/dev/null || echo "[]"
}

# Fetch workflow runs
fetch_workflow_runs() {
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "[]"
    return
  fi

  gh run list \
    --repo "$REPO" \
    --limit 20 \
    --json databaseId,name,status,conclusion,createdAt,headBranch \
    2>/dev/null || echo "[]"
}

# Fetch recent releases
fetch_releases() {
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "[]"
    return
  fi

  gh release list \
    --repo "$REPO" \
    --limit 10 \
    2>/dev/null || echo ""
}

# Calculate health score
calculate_health_score() {
  local blockers="$1"
  local runs="$2"

  local blocker_count
  local p0_count
  local failed_runs
  local score=100

  blocker_count=$(echo "$blockers" | jq 'length')
  p0_count=$(echo "$blockers" | jq '[.[] | select(.labels[].name | test("severity:P0|escalation:P0"))] | length')
  failed_runs=$(echo "$runs" | jq '[.[] | select(.conclusion == "failure")] | length')

  # Deduct points
  score=$((score - blocker_count * 5))
  score=$((score - p0_count * 20))
  score=$((score - failed_runs * 3))

  # Clamp to 0-100
  if [[ $score -lt 0 ]]; then
    score=0
  fi

  echo "$score"
}

# Get health status emoji
get_health_emoji() {
  local score="$1"

  if [[ $score -ge 90 ]]; then
    echo "🟢"
  elif [[ $score -ge 70 ]]; then
    echo "🟡"
  elif [[ $score -ge 50 ]]; then
    echo "🟠"
  else
    echo "🔴"
  fi
}

# Get status badge
get_status_badge() {
  local status="$1"
  case "$status" in
    success|completed) echo "✅" ;;
    failure|failed) echo "❌" ;;
    in_progress|running) echo "🔄" ;;
    queued|pending) echo "⏳" ;;
    cancelled) echo "⚫" ;;
    *) echo "❓" ;;
  esac
}

# Calculate age
calc_age() {
  local created_at="$1"
  local now_epoch
  local created_epoch
  local diff_hours

  now_epoch=$(date +%s)
  created_epoch=$(date -d "$created_at" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created_at" +%s 2>/dev/null || echo "$now_epoch")

  diff_hours=$(( (now_epoch - created_epoch) / 3600 ))

  if [[ $diff_hours -lt 1 ]]; then
    echo "<1h"
  elif [[ $diff_hours -lt 24 ]]; then
    echo "${diff_hours}h"
  else
    echo "$((diff_hours / 24))d"
  fi
}

# Main generation
main() {
  # Fetch data
  local blockers
  local runs
  local latest_stable
  local latest_rc

  blockers=$(fetch_blockers)
  runs=$(fetch_workflow_runs)
  latest_stable=$(get_latest_stable)
  latest_rc=$(get_latest_rc)

  # Calculate metrics
  local blocker_count
  local p0_count
  local p1_count
  local health_score
  local health_emoji

  blocker_count=$(echo "$blockers" | jq 'length')
  p0_count=$(echo "$blockers" | jq '[.[] | select(.labels[].name | test("severity:P0|escalation:P0"))] | length')
  p1_count=$(echo "$blockers" | jq '[.[] | select(.labels[].name | test("severity:P1|escalation:P1"))] | length')

  health_score=$(calculate_health_score "$blockers" "$runs")
  health_emoji=$(get_health_emoji "$health_score")

  # CI metrics
  local total_runs
  local successful_runs
  local failed_runs
  local in_progress_runs
  local ci_success_rate

  total_runs=$(echo "$runs" | jq 'length')
  successful_runs=$(echo "$runs" | jq '[.[] | select(.conclusion == "success")] | length')
  failed_runs=$(echo "$runs" | jq '[.[] | select(.conclusion == "failure")] | length')
  in_progress_runs=$(echo "$runs" | jq '[.[] | select(.status == "in_progress")] | length')

  if [[ $total_runs -gt 0 ]]; then
    ci_success_rate=$(( (successful_runs * 100) / total_runs ))
  else
    ci_success_rate=0
  fi

  # Promotion readiness
  local can_promote="No"
  local promote_blockers=""
  if [[ $blocker_count -eq 0 && $failed_runs -eq 0 ]]; then
    can_promote="Yes"
  else
    if [[ $blocker_count -gt 0 ]]; then
      promote_blockers="$blocker_count blocker(s)"
    fi
    if [[ $failed_runs -gt 0 ]]; then
      if [[ -n "$promote_blockers" ]]; then
        promote_blockers="$promote_blockers, $failed_runs failed run(s)"
      else
        promote_blockers="$failed_runs failed run(s)"
      fi
    fi
  fi

  # Generate JSON data
  local json_data
  json_data=$(jq -n \
    --arg timestamp "$NOW_ISO" \
    --arg repo "$REPO" \
    --arg latest_stable "$latest_stable" \
    --arg latest_rc "$latest_rc" \
    --argjson health_score "$health_score" \
    --argjson blocker_count "$blocker_count" \
    --argjson p0_count "$p0_count" \
    --argjson p1_count "$p1_count" \
    --argjson ci_success_rate "$ci_success_rate" \
    --argjson total_runs "$total_runs" \
    --argjson failed_runs "$failed_runs" \
    --arg can_promote "$can_promote" \
    --argjson blockers "$blockers" \
    --argjson runs "$runs" \
    '{
      timestamp: $timestamp,
      repository: $repo,
      versions: {
        latest_stable: $latest_stable,
        latest_rc: $latest_rc
      },
      health: {
        score: $health_score,
        blocker_count: $blocker_count,
        p0_count: $p0_count,
        p1_count: $p1_count
      },
      ci: {
        success_rate: $ci_success_rate,
        total_runs: $total_runs,
        failed_runs: $failed_runs
      },
      promotion: {
        ready: ($can_promote == "Yes")
      },
      blockers: $blockers,
      recent_runs: $runs
    }')

  echo "$json_data" > "$JSON_OUTPUT"
  echo "Generated JSON: $JSON_OUTPUT" >&2

  # Generate Markdown dashboard
  {
    echo "# Release Train Dashboard"
    echo ""
    echo "**Last Updated:** $NOW_DISPLAY"
    echo "**Repository:** $REPO"
    echo ""
    echo "---"
    echo ""

    # Health Score
    echo "## $health_emoji Release Health: $health_score/100"
    echo ""

    # Quick Stats
    echo "### Quick Stats"
    echo ""
    echo "| Metric | Value |"
    echo "|--------|-------|"
    echo "| **Latest Stable** | \`$latest_stable\` |"
    echo "| **Latest RC** | \`$latest_rc\` |"
    echo "| **Open Blockers** | $blocker_count |"
    echo "| **P0 Critical** | $p0_count |"
    echo "| **CI Success Rate** | $ci_success_rate% |"
    echo "| **Promotion Ready** | $can_promote |"
    echo ""

    # Promotion Status
    echo "---"
    echo ""
    echo "## Promotion Status"
    echo ""
    if [[ "$can_promote" == "Yes" ]]; then
      echo "✅ **Ready for promotion** - No blockers or CI failures"
      echo ""
      echo "To promote:"
      echo '```bash'
      echo "git tag v<next-version>"
      echo "git push origin v<next-version>"
      echo '```'
    else
      echo "❌ **Not ready for promotion**"
      echo ""
      echo "Blocking issues: $promote_blockers"
    fi
    echo ""

    # Release Lines
    echo "---"
    echo ""
    echo "## Release Lines"
    echo ""
    echo "| Line | Status | Latest Tag | Notes |"
    echo "|------|--------|------------|-------|"

    # Current stable
    echo "| **Stable** | 🟢 Released | \`$latest_stable\` | Production |"

    # Current RC
    if [[ "$latest_rc" != "none" ]]; then
      if [[ "$can_promote" == "Yes" ]]; then
        echo "| **RC** | 🟡 Candidate | \`$latest_rc\` | Ready for promotion |"
      else
        echo "| **RC** | 🟠 Blocked | \`$latest_rc\` | Has blockers |"
      fi
    fi

    # Main branch
    echo "| **Main** | 🔄 Development | \`HEAD\` | Active development |"
    echo ""

    # CI Status
    echo "---"
    echo ""
    echo "## CI Status"
    echo ""
    echo "| Workflow | Status | Branch | Age |"
    echo "|----------|--------|--------|-----|"

    echo "$runs" | jq -r '
      .[:10] | .[] |
      "| \(.name) | \(.conclusion // .status) | `\(.headBranch)` | - |"
    ' 2>/dev/null | while read -r line; do
      # Replace status with emoji
      line=$(echo "$line" | sed 's/| success |/| ✅ |/g')
      line=$(echo "$line" | sed 's/| failure |/| ❌ |/g')
      line=$(echo "$line" | sed 's/| in_progress |/| 🔄 |/g')
      line=$(echo "$line" | sed 's/| queued |/| ⏳ |/g')
      line=$(echo "$line" | sed 's/| cancelled |/| ⚫ |/g')
      echo "$line"
    done

    echo ""

    # Blockers
    if [[ $blocker_count -gt 0 ]]; then
      echo "---"
      echo ""
      echo "## 🚧 Active Blockers ($blocker_count)"
      echo ""
      echo "| Issue | Priority | Age | Title |"
      echo "|-------|----------|-----|-------|"

      echo "$blockers" | jq -r '
        sort_by(.createdAt) |
        .[:10] | .[] |
        "| [#\(.number)](https://github.com/'"$REPO"'/issues/\(.number)) | \([.labels[].name] | map(select(test("severity|escalation"))) | first // "P2") | - | \(.title | .[0:50])... |"
      ' 2>/dev/null || echo "| - | - | - | Unable to fetch blockers |"

      echo ""
    fi

    # Recent Activity
    echo "---"
    echo ""
    echo "## Recent Activity"
    echo ""
    echo "| Event | Details | Time |"
    echo "|-------|---------|------|"

    # Show recent runs
    echo "$runs" | jq -r '
      .[:5] | .[] |
      "| CI Run | \(.name) (\(.conclusion // .status)) | \(.createdAt | .[0:10]) |"
    ' 2>/dev/null || echo "| - | No recent activity | - |"

    echo ""

    # Quick Links
    echo "---"
    echo ""
    echo "## Quick Links"
    echo ""
    echo "- [Open Blockers](https://github.com/$REPO/issues?q=is%3Aopen+label%3Arelease-blocker)"
    echo "- [CI Runs](https://github.com/$REPO/actions)"
    echo "- [Releases](https://github.com/$REPO/releases)"
    echo "- [Release Ops Digest](https://github.com/$REPO/actions/workflows/release-ops-digest.yml)"
    echo ""

    # Footer
    echo "---"
    echo ""
    echo "*Dashboard auto-generated by [Release Train Dashboard](../ci/RELEASE_TRAIN_DASHBOARD.md)*"

  } > "$OUTPUT_FILE"

  echo "Generated dashboard: $OUTPUT_FILE" >&2

  # Update state
  if [[ "$DRY_RUN" != "true" ]]; then
    local state
    state=$(cat "$STATE_FILE")

    state=$(echo "$state" | jq \
      --arg time "$NOW_ISO" \
      --argjson score "$health_score" \
      --argjson blockers "$blocker_count" \
      '.last_update = $time | .history = ([{timestamp: $time, health_score: $score, blockers: $blockers}] + .history[:99])')

    echo "$state" > "$STATE_FILE"
    echo "Updated state: $STATE_FILE" >&2
  fi

  echo "" >&2
  echo "Dashboard generation complete!" >&2
  echo "  Health Score: $health_score/100" >&2
  echo "  Blockers: $blocker_count (P0: $p0_count)" >&2
  echo "  Promotion Ready: $can_promote" >&2
}

main "$@"

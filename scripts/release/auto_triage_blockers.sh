#!/usr/bin/env bash
# auto_triage_blockers.sh
#
# Automatically routes release blockers to appropriate teams based on
# labels, file paths, and keywords.
#
# Usage:
#   ./scripts/release/auto_triage_blockers.sh [OPTIONS]
#
# Options:
#   --policy <path>    Path to policy file (default: docs/ci/TRIAGE_ROUTING_POLICY.yml)
#   --state <path>     Path to state file (default: docs/releases/_state/triage_state.json)
#   --issue <number>   Process specific issue only
#   --dry-run          Show what would be done without making changes
#   --force            Process even if recently triaged
#   --help             Show this help message
#
# See docs/ci/AUTO_TRIAGE_ROUTING.md for full documentation.

set -euo pipefail

# Default paths
POLICY_FILE="docs/ci/TRIAGE_ROUTING_POLICY.yml"
STATE_FILE="docs/releases/_state/triage_state.json"
SPECIFIC_ISSUE=""
DRY_RUN=false
FORCE=false

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
    --issue)
      SPECIFIC_ISSUE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
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

# Check dependencies
if ! command -v yq &>/dev/null; then
  echo "Error: yq is required but not installed." >&2
  echo "Install with: brew install yq" >&2
  exit 1
fi

# Load policy
load_policy() {
  if [[ ! -f "$POLICY_FILE" ]]; then
    echo "Error: Policy file not found: $POLICY_FILE" >&2
    exit 1
  fi
}

# Load state
load_state() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE"
  else
    echo '{"version":"1.0.0","last_run_at":null,"processed_issues":{},"routing_stats":{"total_routed":0,"by_team":{}}}'
  fi
}

# Save state
save_state() {
  local state="$1"
  if [[ "$DRY_RUN" != "true" ]]; then
    echo "$state" > "$STATE_FILE"
  fi
}

# Check if issue was recently processed
is_recently_processed() {
  local issue_num="$1"
  local state="$2"
  local cooldown_minutes

  cooldown_minutes=$(yq '.rate_limit.cooldown_minutes // 30' "$POLICY_FILE")

  local last_processed
  last_processed=$(echo "$state" | jq -r ".processed_issues[\"$issue_num\"].last_processed_at // empty")

  if [[ -z "$last_processed" ]]; then
    return 1  # Not processed before
  fi

  local now_epoch
  local last_epoch
  local diff_minutes

  now_epoch=$(date +%s)
  last_epoch=$(date -d "$last_processed" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_processed" +%s 2>/dev/null || echo "0")

  diff_minutes=$(( (now_epoch - last_epoch) / 60 ))

  [[ $diff_minutes -lt $cooldown_minutes ]]
}

# Get team rules from policy
get_team_rules() {
  local team="$1"
  yq ".teams.$team.rules" "$POLICY_FILE" 2>/dev/null || echo "[]"
}

# Check if issue matches a team's rules
matches_team_rules() {
  local team="$1"
  local issue_labels="$2"
  local issue_title="$3"
  local issue_body="$4"

  local rules
  rules=$(get_team_rules "$team")

  # Check label rules
  local label_patterns
  label_patterns=$(echo "$rules" | yq '.[] | select(.type == "label") | .patterns[]' 2>/dev/null || echo "")

  for pattern in $label_patterns; do
    pattern=$(echo "$pattern" | tr -d '"')
    if echo "$issue_labels" | grep -qi "$pattern"; then
      echo "label:$pattern"
      return 0
    fi
  done

  # Check filepath rules
  local filepath_patterns
  filepath_patterns=$(echo "$rules" | yq '.[] | select(.type == "filepath") | .patterns[]' 2>/dev/null || echo "")

  for pattern in $filepath_patterns; do
    pattern=$(echo "$pattern" | tr -d '"')
    if echo "$issue_body" | grep -qi "$pattern"; then
      echo "filepath:$pattern"
      return 0
    fi
  done

  # Check keyword rules
  local keyword_patterns
  keyword_patterns=$(echo "$rules" | yq '.[] | select(.type == "keyword") | .patterns[]' 2>/dev/null || echo "")

  for pattern in $keyword_patterns; do
    pattern=$(echo "$pattern" | tr -d '"')
    if echo "$issue_title $issue_body" | grep -qi "$pattern"; then
      echo "keyword:$pattern"
      return 0
    fi
  done

  return 1
}

# Get all team names from policy
get_teams() {
  yq '.teams | keys | .[]' "$POLICY_FILE" 2>/dev/null || echo ""
}

# Route an issue to a team
route_issue() {
  local issue_num="$1"
  local team="$2"
  local match_reason="$3"

  local team_labels
  local team_assignees

  team_labels=$(yq ".teams.$team.labels[]" "$POLICY_FILE" 2>/dev/null | tr '\n' ',' | sed 's/,$//' | tr -d '"')
  team_assignees=$(yq ".teams.$team.assignees[]" "$POLICY_FILE" 2>/dev/null | head -1 | tr -d '"')

  echo "  Routing #$issue_num to team: $team (matched: $match_reason)" >&2

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [DRY RUN] Would add labels: $team_labels" >&2
    echo "  [DRY RUN] Would assign: $team_assignees" >&2
    return
  fi

  # Add team labels
  if [[ -n "$team_labels" ]]; then
    local label
    for label in $(echo "$team_labels" | tr ',' '\n'); do
      gh issue edit "$issue_num" --repo "$REPO" --add-label "$label" 2>/dev/null || true
    done
  fi

  # Add routing comment
  local add_comment
  add_comment=$(yq '.post_routing_actions.add_routing_comment // true' "$POLICY_FILE")

  if [[ "$add_comment" == "true" ]]; then
    local comment="**Auto-Triage:** Routed to **$team** team.

**Match reason:** \`$match_reason\`

_This issue was automatically triaged based on labels, file paths, or keywords. If this routing is incorrect, please update the labels and re-triage._"

    gh issue comment "$issue_num" --repo "$REPO" --body "$comment" 2>/dev/null || true
  fi

  # Remove needs-triage label
  local remove_triage
  remove_triage=$(yq '.post_routing_actions.remove_triage_label // true' "$POLICY_FILE")

  if [[ "$remove_triage" == "true" ]]; then
    gh issue edit "$issue_num" --repo "$REPO" --remove-label "needs-triage" 2>/dev/null || true
  fi
}

# Route to default team
route_to_default() {
  local issue_num="$1"

  local default_labels
  local default_assignees

  default_labels=$(yq '.default.labels[]' "$POLICY_FILE" 2>/dev/null | tr '\n' ',' | sed 's/,$//' | tr -d '"')

  echo "  No matching team, routing to default" >&2

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [DRY RUN] Would add labels: $default_labels" >&2
    return
  fi

  if [[ -n "$default_labels" ]]; then
    local label
    for label in $(echo "$default_labels" | tr ',' '\n'); do
      gh issue edit "$issue_num" --repo "$REPO" --add-label "$label" 2>/dev/null || true
    done
  fi
}

# Process a single issue
process_issue() {
  local issue_num="$1"
  local state="$2"

  echo "Processing issue #$issue_num..." >&2

  # Check cooldown unless forced
  if [[ "$FORCE" != "true" ]] && is_recently_processed "$issue_num" "$state"; then
    echo "  Skipping: recently processed (cooldown active)" >&2
    return 1
  fi

  # Fetch issue details
  local issue_data
  issue_data=$(gh issue view "$issue_num" --repo "$REPO" --json title,body,labels 2>/dev/null || echo "{}")

  if [[ "$issue_data" == "{}" ]]; then
    echo "  Error: Could not fetch issue details" >&2
    return 1
  fi

  local issue_title
  local issue_body
  local issue_labels

  issue_title=$(echo "$issue_data" | jq -r '.title // ""')
  issue_body=$(echo "$issue_data" | jq -r '.body // ""')
  issue_labels=$(echo "$issue_data" | jq -r '[.labels[].name] | join(",")' 2>/dev/null || echo "")

  # Try to match each team
  local teams
  teams=$(get_teams)

  for team in $teams; do
    local match_reason
    if match_reason=$(matches_team_rules "$team" "$issue_labels" "$issue_title" "$issue_body"); then
      route_issue "$issue_num" "$team" "$match_reason"
      return 0
    fi
  done

  # No team matched, route to default
  route_to_default "$issue_num"
  return 0
}

# Fetch issues needing triage
fetch_issues_to_triage() {
  local trigger_labels
  trigger_labels=$(yq '.trigger_labels | join(",")' "$POLICY_FILE" 2>/dev/null || echo "release-blocker")
  trigger_labels=$(echo "$trigger_labels" | tr -d '"')

  local max_issues
  max_issues=$(yq '.rate_limit.max_issues_per_run // 20' "$POLICY_FILE")

  # For now, just get issues with the needs-triage label or release-blocker
  gh issue list \
    --repo "$REPO" \
    --label "needs-triage" \
    --state open \
    --json number \
    --limit "$max_issues" \
    2>/dev/null || echo "[]"
}

# Main function
main() {
  load_policy

  local state
  state=$(load_state)

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  echo "Starting auto-triage..." >&2
  echo "  Policy: $POLICY_FILE" >&2
  echo "  State: $STATE_FILE" >&2
  [[ "$DRY_RUN" == "true" ]] && echo "  Mode: DRY RUN" >&2

  local processed_count=0
  local routed_count=0

  if [[ -n "$SPECIFIC_ISSUE" ]]; then
    # Process specific issue
    if process_issue "$SPECIFIC_ISSUE" "$state"; then
      routed_count=$((routed_count + 1))
    fi
    processed_count=1
  else
    # Fetch and process all issues needing triage
    local issues
    issues=$(fetch_issues_to_triage)

    local issue_count
    issue_count=$(echo "$issues" | jq 'length')

    echo "  Found $issue_count issues to process" >&2

    echo "$issues" | jq -r '.[].number' | while read -r issue_num; do
      if [[ -n "$issue_num" ]]; then
        if process_issue "$issue_num" "$state"; then
          routed_count=$((routed_count + 1))
        fi
        processed_count=$((processed_count + 1))

        # Update state for this issue
        state=$(echo "$state" | jq \
          --arg num "$issue_num" \
          --arg time "$now_iso" \
          '.processed_issues[$num] = {last_processed_at: $time}')
      fi
    done
  fi

  # Update state
  state=$(echo "$state" | jq \
    --arg time "$now_iso" \
    --argjson routed "$routed_count" \
    '.last_run_at = $time | .routing_stats.total_routed += $routed')

  save_state "$state"

  echo "" >&2
  echo "Auto-triage complete!" >&2
  echo "  Processed: $processed_count issues" >&2
  echo "  Routed: $routed_count issues" >&2
}

main "$@"

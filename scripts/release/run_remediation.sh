#!/usr/bin/env bash
# run_remediation.sh
#
# Executes auto-remediation playbooks for release blockers.
# Matches issues to playbooks and runs appropriate remediation steps.
#
# Usage:
#   ./scripts/release/run_remediation.sh [OPTIONS]
#
# Options:
#   --playbooks <path>  Path to playbooks file (default: docs/ci/REMEDIATION_PLAYBOOKS.yml)
#   --state <path>      Path to state file (default: docs/releases/_state/remediation_state.json)
#   --issue <number>    Process specific issue
#   --playbook <name>   Force specific playbook
#   --dry-run           Show what would be done without executing
#   --force             Bypass cooldown and attempt limits
#   --auto              Only run playbooks marked auto_execute: true
#   --help              Show this help message
#
# See docs/ci/AUTO_REMEDIATION.md for full documentation.

set -euo pipefail

# Default paths
PLAYBOOKS_FILE="docs/ci/REMEDIATION_PLAYBOOKS.yml"
STATE_FILE="docs/releases/_state/remediation_state.json"
SPECIFIC_ISSUE=""
SPECIFIC_PLAYBOOK=""
DRY_RUN=false
FORCE=false
AUTO_ONLY=false

# Repository info
REPO="${GITHUB_REPOSITORY:-$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]\(.*\)\.git/\1/' || echo 'unknown/repo')}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --playbooks)
      PLAYBOOKS_FILE="$2"
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
    --playbook)
      SPECIFIC_PLAYBOOK="$2"
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
    --auto)
      AUTO_ONLY=true
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

# Check dependencies
if ! command -v yq &>/dev/null; then
  echo "Error: yq is required but not installed." >&2
  exit 1
fi

# Load state
load_state() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE"
  else
    echo '{"version":"1.0.0","last_run_at":null,"remediation_history":{},"stats":{"total_attempts":0,"successful":0,"failed":0,"by_playbook":{}}}'
  fi
}

# Save state
save_state() {
  local state="$1"
  if [[ "$DRY_RUN" != "true" ]]; then
    mkdir -p "$(dirname "$STATE_FILE")"
    echo "$state" > "$STATE_FILE"
  fi
}

# Check if issue can be remediated (cooldown/attempts)
can_remediate() {
  local issue_num="$1"
  local state="$2"

  if [[ "$FORCE" == "true" ]]; then
    return 0
  fi

  local max_attempts
  local cooldown_minutes
  max_attempts=$(yq '.settings.max_attempts // 3' "$PLAYBOOKS_FILE")
  cooldown_minutes=$(yq '.settings.cooldown_minutes // 30' "$PLAYBOOKS_FILE")

  # Check attempt count
  local attempts
  attempts=$(echo "$state" | jq -r ".remediation_history[\"$issue_num\"].attempts // 0")
  if [[ $attempts -ge $max_attempts ]]; then
    echo "Max attempts ($max_attempts) reached for issue #$issue_num" >&2
    return 1
  fi

  # Check cooldown
  local last_attempt
  last_attempt=$(echo "$state" | jq -r ".remediation_history[\"$issue_num\"].last_attempt_at // empty")
  if [[ -n "$last_attempt" ]]; then
    local now_epoch
    local last_epoch
    local diff_minutes

    now_epoch=$(date +%s)
    last_epoch=$(date -d "$last_attempt" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_attempt" +%s 2>/dev/null || echo "0")
    diff_minutes=$(( (now_epoch - last_epoch) / 60 ))

    if [[ $diff_minutes -lt $cooldown_minutes ]]; then
      echo "Cooldown active for issue #$issue_num ($diff_minutes < $cooldown_minutes minutes)" >&2
      return 1
    fi
  fi

  return 0
}

# Get all playbook names
get_playbooks() {
  yq '.playbooks | keys | .[]' "$PLAYBOOKS_FILE" 2>/dev/null || echo ""
}

# Get playbook trigger config
get_playbook_triggers() {
  local playbook="$1"
  yq ".playbooks.$playbook.trigger" "$PLAYBOOKS_FILE" 2>/dev/null || echo "{}"
}

# Check if playbook matches issue
playbook_matches_issue() {
  local playbook="$1"
  local issue_labels="$2"
  local issue_title="$3"
  local issue_body="$4"

  local triggers
  triggers=$(get_playbook_triggers "$playbook")

  # Check label triggers
  local trigger_labels
  trigger_labels=$(echo "$triggers" | yq '.labels[]' 2>/dev/null || echo "")

  for label in $trigger_labels; do
    label=$(echo "$label" | tr -d '"')
    if echo "$issue_labels" | grep -qi "$label"; then
      echo "label:$label"
      return 0
    fi
  done

  # Check keyword triggers
  local trigger_keywords
  trigger_keywords=$(echo "$triggers" | yq '.keywords[]' 2>/dev/null || echo "")

  for keyword in $trigger_keywords; do
    keyword=$(echo "$keyword" | tr -d '"')
    if echo "$issue_title $issue_body" | grep -qiE "$keyword"; then
      echo "keyword:$keyword"
      return 0
    fi
  done

  return 1
}

# Check if playbook is auto-execute
is_auto_execute() {
  local playbook="$1"
  local auto_exec
  auto_exec=$(yq ".playbooks.$playbook.auto_execute // false" "$PLAYBOOKS_FILE")
  [[ "$auto_exec" == "true" ]]
}

# Execute a remediation step
execute_step() {
  local playbook="$1"
  local step_index="$2"
  local issue_num="$3"

  local step_name
  local step_action
  local step_params

  step_name=$(yq ".playbooks.$playbook.steps[$step_index].name" "$PLAYBOOKS_FILE")
  step_action=$(yq ".playbooks.$playbook.steps[$step_index].action" "$PLAYBOOKS_FILE")
  step_params=$(yq ".playbooks.$playbook.steps[$step_index].params" "$PLAYBOOKS_FILE" 2>/dev/null || echo "{}")

  echo "    Step $((step_index + 1)): $step_name" >&2
  echo "      Action: $step_action" >&2

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "      [DRY RUN] Would execute action: $step_action" >&2
    return 0
  fi

  case "$step_action" in
    rerun_workflow)
      local workflow
      workflow=$(echo "$step_params" | yq '.workflow // "ci.yml"')
      echo "      Triggering workflow: $workflow" >&2
      gh workflow run "$workflow" --repo "$REPO" 2>/dev/null || true
      ;;

    add_label)
      local label
      label=$(echo "$step_params" | yq '.label' | tr -d '"')
      echo "      Adding label: $label" >&2
      gh issue edit "$issue_num" --repo "$REPO" --add-label "$label" 2>/dev/null || true
      ;;

    clear_cache)
      echo "      Clearing caches..." >&2
      local cache_keys
      cache_keys=$(echo "$step_params" | yq '.cache_keys[]' 2>/dev/null || echo "")
      for key in $cache_keys; do
        key=$(echo "$key" | tr -d '"')
        echo "        Deleting caches matching: $key" >&2
        gh api --method DELETE "/repos/$REPO/actions/caches?key=$key" 2>/dev/null || true
      done
      ;;

    run_command)
      local command
      command=$(echo "$step_params" | yq '.command' | tr -d '"')
      echo "      Running command: $command" >&2
      eval "$command" 2>&1 || true
      ;;

    comment)
      local body
      body=$(echo "$step_params" | yq '.body' | tr -d '"')
      echo "      Adding comment..." >&2
      gh issue comment "$issue_num" --repo "$REPO" --body "$body" 2>/dev/null || true
      ;;

    suggest_fixes)
      echo "      Generating fix suggestions..." >&2
      # Placeholder for AI-assisted fix suggestions
      ;;

    *)
      echo "      Unknown action: $step_action (skipping)" >&2
      ;;
  esac

  return 0
}

# Execute a playbook for an issue
execute_playbook() {
  local playbook="$1"
  local issue_num="$2"
  local match_reason="$3"

  local playbook_name
  local step_count

  playbook_name=$(yq ".playbooks.$playbook.name" "$PLAYBOOKS_FILE" | tr -d '"')
  step_count=$(yq ".playbooks.$playbook.steps | length" "$PLAYBOOKS_FILE")

  echo "  Executing playbook: $playbook_name" >&2
  echo "  Match reason: $match_reason" >&2
  echo "  Steps: $step_count" >&2

  # Execute each step
  local success=true
  for ((i=0; i<step_count; i++)); do
    if ! execute_step "$playbook" "$i" "$issue_num"; then
      success=false
      break
    fi
  done

  # Post remediation comment if enabled
  local post_comment
  post_comment=$(yq '.settings.post_comment // true' "$PLAYBOOKS_FILE")

  if [[ "$post_comment" == "true" && "$DRY_RUN" != "true" ]]; then
    local status_emoji="✅"
    local status_text="completed"
    if [[ "$success" != "true" ]]; then
      status_emoji="⚠️"
      status_text="partially completed"
    fi

    local comment="**Auto-Remediation $status_emoji**

Playbook: **$playbook_name**
Trigger: \`$match_reason\`
Status: $status_text

_This remediation was automatically triggered. Review the changes and close this issue if resolved._"

    gh issue comment "$issue_num" --repo "$REPO" --body "$comment" 2>/dev/null || true
  fi

  [[ "$success" == "true" ]]
}

# Process a single issue
process_issue() {
  local issue_num="$1"
  local state="$2"

  echo "Processing issue #$issue_num..." >&2

  # Check if remediation is allowed
  if ! can_remediate "$issue_num" "$state"; then
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

  # Find matching playbook
  local playbooks
  if [[ -n "$SPECIFIC_PLAYBOOK" ]]; then
    playbooks="$SPECIFIC_PLAYBOOK"
  else
    playbooks=$(get_playbooks)
  fi

  for playbook in $playbooks; do
    # Skip non-auto playbooks if --auto flag is set
    if [[ "$AUTO_ONLY" == "true" ]] && ! is_auto_execute "$playbook"; then
      continue
    fi

    local match_reason
    if match_reason=$(playbook_matches_issue "$playbook" "$issue_labels" "$issue_title" "$issue_body"); then
      if execute_playbook "$playbook" "$issue_num" "$match_reason"; then
        return 0
      fi
    fi
  done

  echo "  No matching playbook found" >&2
  return 1
}

# Fetch issues that might need remediation
fetch_remediation_candidates() {
  # Get issues with release-blocker or needs-remediation labels
  gh issue list \
    --repo "$REPO" \
    --label "release-blocker" \
    --state open \
    --json number \
    --limit 20 \
    2>/dev/null || echo "[]"
}

# Main function
main() {
  local state
  state=$(load_state)

  local now_iso
  now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  echo "Starting auto-remediation..." >&2
  echo "  Playbooks: $PLAYBOOKS_FILE" >&2
  echo "  State: $STATE_FILE" >&2
  [[ "$DRY_RUN" == "true" ]] && echo "  Mode: DRY RUN" >&2
  [[ "$AUTO_ONLY" == "true" ]] && echo "  Filter: AUTO-EXECUTE ONLY" >&2

  local processed_count=0
  local success_count=0

  if [[ -n "$SPECIFIC_ISSUE" ]]; then
    # Process specific issue
    if process_issue "$SPECIFIC_ISSUE" "$state"; then
      success_count=$((success_count + 1))
    fi
    processed_count=1

    # Update state for this issue
    state=$(echo "$state" | jq \
      --arg num "$SPECIFIC_ISSUE" \
      --arg time "$now_iso" \
      '.remediation_history[$num].last_attempt_at = $time | .remediation_history[$num].attempts = ((.remediation_history[$num].attempts // 0) + 1)')
  else
    # Fetch and process all candidates
    local issues
    issues=$(fetch_remediation_candidates)

    local issue_count
    issue_count=$(echo "$issues" | jq 'length')

    echo "  Found $issue_count candidate issues" >&2

    echo "$issues" | jq -r '.[].number' | while read -r issue_num; do
      if [[ -n "$issue_num" ]]; then
        if process_issue "$issue_num" "$state"; then
          success_count=$((success_count + 1))
        fi
        processed_count=$((processed_count + 1))

        # Update state for this issue
        state=$(echo "$state" | jq \
          --arg num "$issue_num" \
          --arg time "$now_iso" \
          '.remediation_history[$num].last_attempt_at = $time | .remediation_history[$num].attempts = ((.remediation_history[$num].attempts // 0) + 1)')
      fi
    done
  fi

  # Update global stats
  state=$(echo "$state" | jq \
    --arg time "$now_iso" \
    --argjson processed "$processed_count" \
    --argjson success "$success_count" \
    '.last_run_at = $time | .stats.total_attempts += $processed | .stats.successful += $success')

  save_state "$state"

  echo "" >&2
  echo "Auto-remediation complete!" >&2
  echo "  Processed: $processed_count issues" >&2
  echo "  Successful: $success_count remediations" >&2
}

main "$@"

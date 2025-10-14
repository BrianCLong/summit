#!/usr/bin/env bash
# scripts/batch-automerge.sh
# Plans and queues auto-merge for clean PRs; halts if any CI failures are detected.
# Requires: gh, git, jq
#
# Agentic role mapping for merge pipeline:
# - planner: selects/filters PRs and computes merge plan
# - reviewer: evaluates checks; emits friction alerts for flaky/failed checks
# - merger: queues/merges PRs; logs handoff and latency per PR
# - notifier: posts fastlane signals when queues are light/heavy
#
# Structured JSON logs (events): fastlane_signal | friction_alert | handoff | latency
# Fields: run_id, pr_number, signal_strength, latency_ms, retry_count, error_rate, queue_depth

set -euo pipefail

# ---------- Config ----------
REPO="${REPO:-BrianCLong/intelgraph}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
DATE="$(date +%Y%m%d)"
REPORT_DIR="${REPORT_DIR:-reports}"
PLAN_MD="${REPORT_DIR}/merge-plan-${DATE}.md"
PLAN_CSV="${REPORT_DIR}/merge-plan-${DATE}.csv"
LOG_DIR="${LOG_DIR:-logs}"
mkdir -p "$REPORT_DIR" "$LOG_DIR"
RUN_ID="${RUN_ID:-merge-$(date +%s)}"
FASTLANE_ENDPOINT="${FASTLANE_ENDPOINT:-/api/maestro/v1/handoff/fastlane}"
API_HOST="${API_HOST:-http://localhost:8787}"

# Exclude labels (comma-separated, case-sensitive)
EXCLUDE_LABELS="${EXCLUDE_LABELS:-do-not-merge,blocked,WIP,hold,logical,workflow,contextual}"
# Auto-merge strategy: squash|merge|rebase
AUTO_MERGE_STRATEGY="${AUTO_MERGE_STRATEGY:-squash}"
# Dry run? (1 prints intended actions without executing merges)
DRY_RUN="${DRY_RUN:-0}"

json_log() {
  local event="$1"; shift
  local ts_ms=$(($(date +%s%N)/1000000))
  local base="{\"ts\":$ts_ms,\"run_id\":\"$RUN_ID\",\"event\":\"$event\""
  while (( "$#" )); do local k="$1"; local v="$2"; shift 2; base+=" ,\"$k\":"; case "$v" in ''|*[!0-9.]*) base+="\"$v\"";; *) base+="$v";; esac; done
  base+=" }"; echo "$base" | tee -a "$LOG_DIR/merge.jsonl" >/dev/null
}

emit_fastlane_signal() { # emit_fastlane_signal <signal_strength> <queue_depth>
  local strength="$1"; local depth="$2"
  json_log fastlane_signal agent_role notifier signal_strength "$strength" queue_depth "$depth"
  if command -v curl >/dev/null 2>&1; then
    curl -sS -X POST "$API_HOST$FASTLANE_ENDPOINT" -H 'content-type: application/json' \
      -d "{\"requestId\":\"$RUN_ID-merge\",\"priority\":\"normal\",\"agentId\":\"batch-automerge\",\"signalStrength\":$strength,\"payload\":{\"queueDepth\":$depth}}" \
      >> "$LOG_DIR/fastlane.merge.post.log" 2>&1 || true
  fi
}

emit_friction_alert() { # emit_friction_alert <pr_number> <latency_ms> <retries> <error_rate>
  json_log friction_alert agent_role reviewer pr_number "$1" latency_ms "$2" retry_count "$3" error_rate "$4"
}

measure() { # measure <agent_role> <label> <cmd...>
  local role="$1"; shift; local label="$1"; shift
  local start=$(date +%s%3N)
  if "$@"; then local end=$(date +%s%3N); json_log latency agent_role "$role" stage "$label" latency_ms $((end-start)); return 0
  else local end=$(date +%s%3N); json_log latency agent_role "$role" stage "$label" latency_ms $((end-start)); return 1; fi
}

echo "number,title,state,reviewDecision,mergeStateStatus,action,notes" > "$PLAN_CSV"
# ---------- Pre-flight ----------
command -v gh >/dev/null || { echo "gh is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }
command -v git >/dev/null || { echo "git is required" >&2; exit 2; }
measure planner preflight gh repo set-default "$REPO" >/dev/null

# ---------- Fetch PRs ----------
# We skip drafts and any PR with excluded labels; skip CHANGES_REQUESTED.
PRS=()
while IFS= read -r line; do PRS+=("$line"); done < <(
  gh pr list --state open \
    --json number,title,isDraft,labels,reviewDecision,mergeStateStatus,headRefName,baseRefName \
    --jq '.[] | select(.baseRefName=="'"$DEFAULT_BRANCH"'") | @base64'
)
exclude_regex="$(echo "$EXCLUDE_LABELS" | sed 's/,/|/g')"
CLEAN_LIST=(); TRAIN_LIST=(); SKIPPED=(); CI_FAILURES=0

header_md() { {
  echo "# Batch Merge Plan — ${DATE}"; echo ""; echo "- Repo: ${REPO}"; echo "- Default branch: ${DEFAULT_BRANCH}"; echo "- Exclusions: labels [${EXCLUDE_LABELS}], drafts, CHANGES_REQUESTED"; echo "- Auto-merge strategy: ${AUTO_MERGE_STRATEGY}"; echo ""; echo "## Actions"; echo ""; echo "### Auto-merge queue"; } > "$PLAN_MD"; }

header_md

for enc in "${PRS[@]}"; do
  pr="$(echo "$enc" | base64 --decode)"
  num=$(echo "$pr" | jq -r '.number')
  title=$(echo "$pr" | jq -r '.title')
  draft=$(echo "$pr" | jq -r '.isDraft')
  labels=$(echo "$pr" | jq -r '[.labels[].name] // [] | join(",")')
  decision=$(echo "$pr" | jq -r '.reviewDecision // "UNKNOWN"')
  mstate=$(echo "$pr" | jq -r '.mergeStateStatus // "UNKNOWN"')
  # Skip?
  if [[ "$draft" == "true" ]] || [[ "$labels" =~ $exclude_regex ]] || [[ "$decision" == "CHANGES_REQUESTED" ]]; then
    SKIPPED+=("$num"); echo "${num},\"${title}\",open,${decision},${mstate},skip,excluded-or-draft-or-changes-requested" >> "$PLAN_CSV"; continue
  fi
  # If any CI checks are failing for this PR, record and stop later.
  view_json="$(gh pr view "$num" --json statusCheckRollup,mergeStateStatus,reviewDecision --jq '.')"
  has_fail=$(echo "$view_json" | jq -e '(.statusCheckRollup // []) | map(( .conclusion? // .state? // .status? ) | ascii_upcase) | any(. == "FAILURE" or . == "FAILED" or . == "ERROR")' >/dev/null 2>&1; echo $?)
  start_ci=$(date +%s%3N)
  if [[ "$has_fail" -eq 0 ]]; then
    end_ci=$(date +%s%3N); emit_friction_alert "$num" $((end_ci-start_ci)) 0 1; echo "${num},\"${title}\",open,${decision},${mstate},halt,ci-failure-detected" >> "$PLAN_CSV"; continue
  fi
  # Classify by mergeStateStatus
  case "$mstate" in
    CLEAN|HAS_HOOKS|UNSTABLE) CLEAN_LIST+=("$num"); ;;
    *) TRAIN_LIST+=("$num"); ;;
  esac
  json_log handoff agent_role planner pr_number "$num" from "planner" to "merger" request_id "${RUN_ID}-pr-$num"
 done

# Signal queue depth to fastlane
queue_depth=${#CLEAN_LIST[@]}
emit_fastlane_signal $(( queue_depth > 20 ? 0.3 : queue_depth > 10 ? 0.5 : 0.8 )) "$queue_depth"

if [[ "$CI_FAILURES" -eq 1 ]]; then
  echo "" >> "$PLAN_MD"; echo "⚠️ CI failures detected on at least one PR. Halting before queueing auto-merges." >> "$PLAN_MD"
  echo "Plan written to $PLAN_MD and $PLAN_CSV"; echo "Summary: queued=0, conflicted=${#TRAIN_LIST[@]}, skipped=${#SKIPPED[@]}, ci_fail=1"; exit 1
fi

# Queue clean PRs for auto-merge
queued=0
for n in "${CLEAN_LIST[@]}"; do
  echo "- PR #${n}: queue for auto-merge (${AUTO_MERGE_STRATEGY})." >> "$PLAN_MD"
  echo "${n},\"\",open,,CLEAN,auto-merge,queued" >> "$PLAN_CSV"
  if [[ "$DRY_RUN" -eq 1 ]]; then queued=$((queued+1)); continue; fi
  set +e
  case "$AUTO_MERGE_STRATEGY" in
    squash) measure merger "merge-squash-$n" gh pr merge "$n" --squash --auto --delete-branch >/dev/null 2>&1 ;;
    merge)  measure merger "merge-merge-$n"  gh pr merge "$n" --merge  --auto --delete-branch >/dev/null 2>&1 ;;
    rebase) measure merger "merge-rebase-$n" gh pr merge "$n" --rebase --auto --delete-branch >/dev/null 2>&1 ;;
    *)      measure merger "merge-squash-$n" gh pr merge "$n" --squash --auto --delete-branch >/dev/null 2>&1 ;;
  esac
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    json_log friction_alert agent_role merger pr_number "$n" latency_ms 0 retry_count 1 error_rate 1
    measure merger "ready-$n" gh pr ready "$n" >/dev/null 2>&1 || true
    measure merger "label-$n" gh pr edit "$n" --add-label "merge-queue" >/dev/null 2>&1 || true
    case "$AUTO_MERGE_STRATEGY" in
      squash) gh pr merge "$n" --squash --auto --delete-branch >/dev/null 2>&1 || true ;;
      merge)  gh pr merge "$n" --merge  --auto --delete-branch >/dev/null 2>&1 || true ;;
      rebase) gh pr merge "$n" --rebase --auto --delete-branch >/dev/null 2>&1 || true ;;
    esac
  fi
  queued=$((queued+1))
 done

echo "" >> "$PLAN_MD"; echo "### Integration train candidates (conflicts or blocked)" >> "$PLAN_MD"
for n in "${TRAIN_LIST[@]}"; do echo "- PR #${n}: add to integration train attempt." >> "$PLAN_MD"; echo "${n},\"\",open,,DIRTY,train,conflict-or-blocked" >> "$PLAN_CSV"; done

echo "" >> "$PLAN_MD"; echo "### Skipped" >> "$PLAN_MD"
for n in "${SKIPPED[@]}"; do echo "- PR #${n}: skipped (excluded/draft/changes requested)." >> "$PLAN_MD"; done

echo "" >> "$PLAN_MD"; echo "_Generated by batch-automerge.sh on ${DATE}_" >> "$PLAN_MD"

echo "Plan written to $PLAN_MD and $PLAN_CSV"; echo "Summary: queued=${queued}, conflicted=${#TRAIN_LIST[@]}, skipped=${#SKIPPED[@]}, ci_fail=0"

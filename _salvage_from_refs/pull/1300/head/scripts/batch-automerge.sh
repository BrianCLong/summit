#!/usr/bin/env bash
# scripts/batch-automerge.sh
# Plans and queues auto-merge for clean PRs; halts if any CI failures are detected.
# Requires: gh, git, jq
set -euo pipefail

# ---------- Config ----------
REPO="${REPO:-BrianCLong/intelgraph}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
DATE="$(date +%Y%m%d)"
REPORT_DIR="${REPORT_DIR:-reports}"
PLAN_MD="${REPORT_DIR}/merge-plan-${DATE}.md"
PLAN_CSV="${REPORT_DIR}/merge-plan-${DATE}.csv"
# Exclude labels (comma-separated, case-sensitive)
EXCLUDE_LABELS="${EXCLUDE_LABELS:-do-not-merge,blocked,WIP,hold,logical,workflow,contextual}"
# Auto-merge strategy: squash|merge|rebase
AUTO_MERGE_STRATEGY="${AUTO_MERGE_STRATEGY:-squash}"
# Dry run? (1 prints intended actions without executing merges)
DRY_RUN="${DRY_RUN:-0}"

mkdir -p "$REPORT_DIR"
echo "number,title,state,reviewDecision,mergeStateStatus,action,notes" > "$PLAN_CSV"

# ---------- Pre-flight ----------
command -v gh >/dev/null || { echo "gh is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }
command -v git >/dev/null || { echo "git is required" >&2; exit 2; }

gh repo set-default "$REPO" >/dev/null

# ---------- Fetch PRs ----------
# We skip drafts and any PR with excluded labels; skip CHANGES_REQUESTED.
PRS=()
while IFS= read -r line; do
  PRS+=("$line")
done < <(
  gh pr list --state open \
    --json number,title,isDraft,labels,reviewDecision,mergeStateStatus,headRefName,baseRefName \
    --jq '.[] | select(.baseRefName=="'"$DEFAULT_BRANCH"'") | @base64'
)

exclude_regex="$(echo "$EXCLUDE_LABELS" | sed 's/,/|/g')"

CLEAN_LIST=()
TRAIN_LIST=()
SKIPPED=()
CI_FAILURES=0

header_md() {
  {
    echo "# Batch Merge Plan — ${DATE}"
    echo ""
    echo "- Repo: ${REPO}"
    echo "- Default branch: ${DEFAULT_BRANCH}"
    echo "- Exclusions: labels [${EXCLUDE_LABELS}], drafts, CHANGES_REQUESTED"
    echo "- Auto-merge strategy: ${AUTO_MERGE_STRATEGY}"
    echo ""
    echo "## Actions"
    echo ""
    echo "### Auto-merge queue"
  } > "$PLAN_MD"
}
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
    SKIPPED+=("$num")
    echo "${num},\"${title}\",open,${decision},${mstate},skip,excluded-or-draft-or-changes-requested" >> "$PLAN_CSV"
    continue
  fi

  # If any CI checks are failing for this PR, record and stop later.
  view_json="$(gh pr view "$num" --json statusCheckRollup,mergeStateStatus,reviewDecision --jq '.')"
  has_fail=$(echo "$view_json" | jq -e '
    (.statusCheckRollup // []) | map(
      ( .conclusion? // .state? // .status? ) | ascii_upcase
    )
    | any(. == "FAILURE" or . == "FAILED" or . == "ERROR")
  ' >/dev/null 2>&1; echo $?)
  if [[ "$has_fail" -eq 0 ]]; then
    CI_FAILURES=1
    echo "${num},\"${title}\",open,${decision},${mstate},halt,ci-failure-detected" >> "$PLAN_CSV"
    continue
  fi

  # Classify by mergeStateStatus
  case "$mstate" in
    CLEAN|HAS_HOOKS|UNSTABLE)
      CLEAN_LIST+=("$num")
      ;;
    *)
      TRAIN_LIST+=("$num")
      ;;
  esac
done

if [[ "$CI_FAILURES" -eq 1 ]]; then
  echo "" >> "$PLAN_MD"
  echo "⚠️ CI failures detected on at least one PR. Halting before queueing auto-merges." >> "$PLAN_MD"
  echo "Plan written to $PLAN_MD and $PLAN_CSV"
  echo "Summary: queued=0, conflicted=${#TRAIN_LIST[@]}, skipped=${#SKIPPED[@]}, ci_fail=1"
  exit 1
fi

# Queue clean PRs for auto-merge
queued=0
for n in "${CLEAN_LIST[@]}"; do
  echo "- PR #${n}: queue for auto-merge (${AUTO_MERGE_STRATEGY})." >> "$PLAN_MD"
  echo "${n},\"\",open,,CLEAN,auto-merge,queued" >> "$PLAN_CSV"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    queued=$((queued+1))
    continue
  fi
  set +e
  case "$AUTO_MERGE_STRATEGY" in
    squash) gh pr merge "$n" --squash --auto --delete-branch >/dev/null 2>&1 ;;
    merge)  gh pr merge "$n" --merge  --auto --delete-branch >/dev/null 2>&1 ;;
    rebase) gh pr merge "$n" --rebase --auto --delete-branch >/dev/null 2>&1 ;;
    *)      gh pr merge "$n" --squash --auto --delete-branch >/dev/null 2>&1 ;;
  esac
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    # Attempt to ready/update branch and re-queue
    gh pr ready "$n" >/dev/null 2>&1 || true
    gh pr edit "$n" --add-label "merge-queue" >/dev/null 2>&1 || true
    case "$AUTO_MERGE_STRATEGY" in
      squash) gh pr merge "$n" --squash --auto --delete-branch >/dev/null 2>&1 || true ;;
      merge)  gh pr merge "$n" --merge  --auto --delete-branch >/dev/null 2>&1 || true ;;
      rebase) gh pr merge "$n" --rebase --auto --delete-branch >/dev/null 2>&1 || true ;;
    esac
  fi
  queued=$((queued+1))
done

echo "" >> "$PLAN_MD"
echo "### Integration train candidates (conflicts or blocked)" >> "$PLAN_MD"
for n in "${TRAIN_LIST[@]}"; do
  echo "- PR #${n}: add to integration train attempt." >> "$PLAN_MD"
  echo "${n},\"\",open,,DIRTY,train,conflict-or-blocked" >> "$PLAN_CSV"
done

echo "" >> "$PLAN_MD"
echo "### Skipped" >> "$PLAN_MD"
for n in "${SKIPPED[@]}"; do
  echo "- PR #${n}: skipped (excluded/draft/changes requested)." >> "$PLAN_MD"
done

echo "" >> "$PLAN_MD"
echo "_Generated by batch-automerge.sh on ${DATE}_" >> "$PLAN_MD"

echo "Plan written to $PLAN_MD and $PLAN_CSV"
echo "Summary: queued=${queued}, conflicted=${#TRAIN_LIST[@]}, skipped=${#SKIPPED[@]}, ci_fail=0"
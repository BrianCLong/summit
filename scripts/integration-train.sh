#!/usr/bin/env bash
# scripts/integration-train.sh
# Creates an integration branch, merges train PRs, opens a draft PR to main.
set -euo pipefail

REPO="${REPO:-BrianCLong/intelgraph}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
DATE="$(date +%Y%m%d)"
TRAIN_BRANCH="${TRAIN_BRANCH:-integration/batch-${DATE}}"
REPORT_DIR="${REPORT_DIR:-reports}"
CONF_MD="${REPORT_DIR}/integration-train-${DATE}.md"
DRY_RUN="${DRY_RUN:-0}"

mkdir -p "$REPORT_DIR"
gh repo set-default "$REPO" >/dev/null

PLAN_CSV="${REPORT_DIR}/merge-plan-${DATE}.csv"
if [[ ! -f "$PLAN_CSV" ]]; then
  echo "Missing ${PLAN_CSV}. Run scripts/batch-automerge.sh first." >&2
  exit 3
fi

echo "# Integration Train — ${DATE}" > "$CONF_MD"
echo "" >> "$CONF_MD"
echo "- Branch: \`${TRAIN_BRANCH}\`" >> "$CONF_MD"
echo "- Base: \`${DEFAULT_BRANCH}\`" >> "$CONF_MD"
echo "" >> "$CONF_MD"
echo "## Merges" >> "$CONF_MD"

TRAIN_PRS=()
while IFS= read -r line; do
  TRAIN_PRS+=("$line")
done < <(awk -F',' '$6=="train"{print $1}' "$PLAN_CSV" | sed 's/"//g' | sort -u)

git fetch origin
git checkout -B "$TRAIN_BRANCH" "origin/${DEFAULT_BRANCH}"

conflicts=0
merged=0

for n in "${TRAIN_PRS[@]}"; do
  [[ -z "$n" ]] && continue
  echo "Processing PR #$n"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "- PR #${n}: (dry-run) would attempt merge." >> "$CONF_MD"
    continue
  fi

  git fetch origin "pull/${n}/head:pr-${n}" || { echo "- PR #${n}: fetch failed" >> "$CONF_MD"; continue; }
  set +e
  git merge --no-ff --no-commit "pr-${n}"
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    conflicts=$((conflicts+1))
    echo "- PR #${n}: **CONFLICT** — left for author to rebase" >> "$CONF_MD"
    git merge --abort
    git branch -D "pr-${n}" >/dev/null 2>&1 || true
    gh pr comment "$n" --body "Integration train \`${TRAIN_BRANCH}\` found conflicts. Please rebase on latest \`${DEFAULT_BRANCH}\` and resolve." >/dev/null 2>&1 || true
    continue
  fi
  git commit -m "Merge PR #${n} into ${TRAIN_BRANCH}"
  merged=$((merged+1))
  echo "- PR #${n}: merged into train" >> "$CONF_MD"
  git branch -D "pr-${n}" >/dev/null 2>&1 || true
done

if [[ "$DRY_RUN" -eq 0 ]]; then
  git push -u origin "$TRAIN_BRANCH"
  # Open or update draft integration PR
  set +e
  gh pr create --base "$DEFAULT_BRANCH" --head "$TRAIN_BRANCH" --title "Integration Batch ${DATE}" \
    --body "$(cat "$CONF_MD")" --label integration-batch --draft >/dev/null 2>&1
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    # Update existing PR if already open
    gh pr edit "$TRAIN_BRANCH" --add-label integration-batch --body "$(cat "$CONF_MD")" >/dev/null 2>&1 || true
  fi
fi

echo "Integration train summary: merged=${merged}, conflicts=${conflicts}"
echo "Report written to $CONF_MD"
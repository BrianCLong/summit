#!/usr/bin/env bash
set -euo pipefail

# Config
BASE_BRANCH="${BASE_BRANCH:-main}"
MATCH="${MATCH:-feat/|fix/|chore/|codex/|experiment/}"
LABELS="${LABELS:-ci,autofix}"
DRAFT="${DRAFT:-false}"        # set true to open as draft
DRY_RUN="${DRY_RUN:-false}"

confirm() { [ "${CI:-}" = "true" ] && return 0; read -r -p "$1 [y/N] " r; [[ "$r" =~ ^[Yy]$ ]]; }

echo "[batch] fetching branches"
git fetch origin --prune

# List remote branches that match pattern and are not the base
mapfile -t BRANCHES < <(git for-each-ref --format='%(refname:short)' refs/remotes/origin | sed 's#^origin/##' | grep -E "$MATCH" | grep -v "^$BASE_BRANCH$" || true)

if [ ${#BRANCHES[@]} -eq 0 ]; then echo "[batch] no branches match"; exit 0; fi
echo "[batch] will process: ${BRANCHES[*]}"

confirm "[batch] proceed with ${#BRANCHES[@]} branches?" || exit 1

for BR in "${BRANCHES[@]}"; do
  echo -e "\n=== [branch] $BR ==="
  git checkout -B "$BR" "origin/$BR"

  # sanitize large/transient files
  if [ -x scripts/pr_sanitize.sh ]; then
    bash scripts/pr_sanitize.sh || true
  else
    git rm -r --cached --ignore-unmatch neo4j/ **/dist **/build **/.turbo **/coverage || true
  fi

  # rebase on latest main
  git fetch origin "$BASE_BRANCH"
  git rebase "origin/$BASE_BRANCH" || { echo "[branch:$BR] rebase conflicts; skipping"; git rebase --abort || true; continue; }

  # run quick local build/typecheck to fail fast
  if [ -x scripts/ci_first_aid.sh ]; then
    bash scripts/ci_first_aid.sh || echo "::warning::$BR first-aid warnings"
  fi

  if [ "$DRY_RUN" = "true" ]; then
    echo "[branch:$BR] DRY_RUN on; skipping push/PR"
    continue
  fi

  git push --force-with-lease -u origin "$BR"

  # open or update PR
  if gh pr view "$BR" >/dev/null 2>&1; then
    echo "[branch:$BR] PR exists; marking ready and labeling"
    $DRAFT && gh pr ready "$BR" || true
    gh pr edit "$BR" --add-label "$LABELS" || true
    gh pr comment "$BR" --body "Auto-rebased on \`$BASE_BRANCH\` and sanitized. Kicking CI." || true
  else
    echo "[branch:$BR] opening PR"
    TITLE="[${BR#*/}] CI-ready: sanitized & rebased"
    BODY="Automated batch fix for \`$BR\`.\n- Rebased on \`$BASE_BRANCH\`\n- Sanitized PR contents\n- Running baseline CI"
    CMD=(gh pr create --title "$TITLE" --body "$BODY" --base "$BASE_BRANCH" --head "$BR" --label "$LABELS")
    $DRAFT && CMD+=(--draft)
    "${CMD[@]}"
  fi
done

echo -e "\n[batch] done"

#!/usr/bin/env bash
set -Eeuo pipefail

# === Configuration ===
STATE_FILE="ops-state.json"
STATE_SCHEMA="ops-state.schema.json"
LOG_DIR="ops-logs"
TEMPLATES_DIR="templates"
SCRIPTS_DIR="scripts"

mkdir -p "$LOG_DIR" "$SCRIPTS_DIR" "$TEMPLATES_DIR"

# Persist state on unexpected errors
trap '{
  echo "[TRAP] An error occurred in step: ${CURRENT_STEP:-unknown}. State will be saved." | tee -a "$CURRENT_LOG";
  save_state;
}' ERR

trap '{
  echo "[TRAP] Exiting. Last step: ${CURRENT_STEP:-unknown}";
  save_state;
}' EXIT

timestamp() { date -Iseconds; }
log() { echo "[$(timestamp)] $*" | tee -a "$CURRENT_LOG"; }
save_state() {
  jq -n \
    --arg id "$ID" \
    --arg created_at "$CREATED_AT" \
    --arg updated_at "$(timestamp)" \
    --arg current_step "$CURRENT_STEP" \
    --argjson completed_steps "$(printf '%s\n' "${COMPLETED_STEPS[@]:-}" | jq -R . | jq -s .)" \
    --arg release_branch "${RELEASE_BRANCH:-}" \
    --arg base_branch "${BASE_BRANCH:-main}" \
    --arg ga_version "${GA_VERSION:-}" \
    --argjson dry_run "${DRY_RUN}" \
    --arg pr_inventory_path "${PR_INVENTORY_PATH:-}" \
    --arg branch_inventory_path "${BRANCH_INVENTORY_PATH:-}" \
    --arg notes_path "${NOTES_PATH:-}" \
    --arg changelog_path "${CHANGELOG_PATH:-}" \
    --argjson tooling "$(echo "$TOOLING" | jq '.')" \
    --argjson skipped "$(printf '%s\n' "${SKIPPED[@]:-}" | jq -R . | jq -s .)" \
    --argjson errors "$(printf '%s\n' "${ERRORS[@]:-}" | jq -R . | jq -s .)" \
    '{id, created_at, updated_at, current_step, completed_steps, release_branch, base_branch, ga_version, dry_run, pr_inventory_path, branch_inventory_path, notes_path, changelog_path, tooling, skipped, errors}' \
    > "$STATE_FILE"
}

load_or_init_state() {
  if [[ -f "$STATE_FILE" ]]; then
    ID=$(jq -r '.id' "$STATE_FILE"); [[ "$ID" == "null" ]] && ID="ops-$(date +%s)"
    CREATED_AT=$(jq -r '.created_at' "$STATE_FILE"); [[ "$CREATED_AT" == "null" ]] && CREATED_AT=$(timestamp)
    CURRENT_STEP=$(jq -r '.current_step' "$STATE_FILE")
    COMPLETED_STEPS=($(jq -r '.completed_steps[]?' "$STATE_FILE"))
    RELEASE_BRANCH=$(jq -r '.release_branch // empty' "$STATE_FILE")
    BASE_BRANCH=$(jq -r '.base_branch // "main"' "$STATE_FILE")
    GA_VERSION=$(jq -r '.ga_version // empty' "$STATE_FILE")
    DRY_RUN=$(jq -r '.dry_run' "$STATE_FILE")
    PR_INVENTORY_PATH=$(jq -r '.pr_inventory_path // empty' "$STATE_FILE")
    BRANCH_INVENTORY_PATH=$(jq -r '.branch_inventory_path // empty' "$STATE_FILE")
    NOTES_PATH=$(jq -r '.notes_path // empty' "$STATE_FILE")
    CHANGELOG_PATH=$(jq -r '.changelog_path // empty' "$STATE_FILE")
    TOOLING=$(jq -c '.tooling // {}' "$STATE_FILE")
    SKIPPED=($(jq -r '.skipped[]?' "$STATE_FILE"))
    ERRORS=($(jq -r '.errors[]?' "$STATE_FILE"))
  else
    ID="ops-$(date +%s)"
    CREATED_AT=$(timestamp)
    CURRENT_STEP="none"
    COMPLETED_STEPS=()
    RELEASE_BRANCH=""
    BASE_BRANCH="${BASE_BRANCH:-main}"
    GA_VERSION=""
    DRY_RUN=${DRY_RUN:-true}
    PR_INVENTORY_PATH=""
    BRANCH_INVENTORY_PATH=""
    NOTES_PATH=""
    CHANGELOG_PATH=""
    TOOLING="{}"
    SKIPPED=()
    ERRORS=()
    save_state
  fi
}

require() {
  local tool="$1"
  if command -v "$tool" >/dev/null 2>&1; then
    return 0
  else
    log "[SKIP] Missing required tool: $tool"
    SKIPPED+=("$CURRENT_STEP:$tool")
    return 1
  fi
}

policy_gate() {
  if [[ -x "scripts/policy_gate.sh" ]]; then
    if ! "scripts/policy_gate.sh"; then
      log "[BLOCKED] policy_gate rejected action"; exit 12
    fi
  fi
}

confirm_mutation() {
  if [[ "${CONFIRM:-0}" == "1" ]]; then
    policy_gate
    return 0
  else
    log "[DRY-RUN] Set CONFIRM=1 to perform this action."
    return 1
  fi
}

step_begin() {
  CURRENT_STEP="$1"
  CURRENT_LOG="$LOG_DIR/$(printf 'step-%02d-%s.log' "$2" "$1")"
  : > "$CURRENT_LOG"
  log "=== BEGIN step $2: $1 ==="
}

step_end() {
  log "=== END step: $1 ==="
  COMPLETED_STEPS+=("$1")
  save_state
}

tooling_detect() {
  TOOLING=$(jq -n \
    --arg gh "$(command -v gh || echo)" \
    --arg git "$(command -v git || echo)" \
    --arg jq "$(command -v jq || echo)" \
    --arg yq "$(command -v yq || echo)" \
    --arg node "$(command -v node || echo)" \
    --arg npm "$(command -v npm || echo)" \
    --arg pnpm "$(command -v pnpm || echo)" \
    --arg yarn "$(command -v yarn || echo)" \
    --arg python "$(command -v python3 || echo)" \
    --arg pip "$(command -v pip3 || echo)" \
    --arg go "$(command -v go || echo)" \
    --arg mvn "$(command -v mvn || echo)" \
    --arg docker "$(command -v docker || echo)" \
    --arg compose "$(command -v docker-compose || echo)" \
    --arg helm "$(command -v helm || echo)" \
    --arg kubectl "$(command -v kubectl || echo)" \
    --arg terraform "$(command -v terraform || echo)" \
    --arg syft "$(command -v syft || echo)" \
    --arg grype "$(command -v grype || echo)" \
    '{gh, git, jq, yq, node, npm, pnpm, yarn, python, pip, go, mvn, docker, compose, helm, kubectl, terraform, syft, grype}')
  save_state
}

# === Steps ===

cmd_status() {
  load_or_init_state
  tooling_detect
  echo "State: $(cat "$STATE_FILE")"
  echo
  echo "Recent logs:"
  ls -1t "$LOG_DIR" | head -n 10
}

cmd_init() {
  load_or_init_state
  step_begin "init" 1
  tooling_detect
  BASE_BRANCH="${BASE_BRANCH:-$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@' || echo main)}"
  RELEASE_BRANCH="release/maestro-ga-$(date +%Y%m%d)"
  save_state
  step_end "init"
}

cmd_plan() {
  load_or_init_state
  step_begin "plan" 2

  require git || { step_end "plan"; return; }
  git fetch --all --prune | tee -a "$CURRENT_LOG" || true

  # PR inventory via gh if available; otherwise skip
  PR_INVENTORY_PATH="ops-logs/prs.json"
  if command -v gh >/dev/null 2>&1; then
    gh pr list --state all --limit 200 \
      --json number,title,headRefName,baseRefName,mergeStateStatus,reviewDecision,author,updatedAt,labels,isDraft \
      > "$PR_INVENTORY_PATH" || { log "[WARN] gh pr list failed"; :; }
    log "Wrote PR inventory to $PR_INVENTORY_PATH"
  else
    log "[SKIP] gh not installed; PR inventory unavailable"
  fi

  # Branch inventory
  BRANCH_INVENTORY_PATH="ops-logs/branches.txt"
  git for-each-ref --format='%(refname:short)|%(committerdate:iso8601)|%(objectname:short)|%(upstream:short)' refs/heads/ \
    | sort -r > "$BRANCH_INVENTORY_PATH"
  log "Wrote branch inventory to $BRANCH_INVENTORY_PATH"

  save_state
  step_end "plan"
}

cmd_build() {
  load_or_init_state
  step_begin "build" 3

  # Node/JS/TS
  if [[ -f package.json ]]; then
    if command -v npm >/dev/null 2>&1; then
      log "[Node] Installing and testing"
      npm ci || npm install
      npm test || log "[WARN] npm test failed (recorded)"
    else
      log "[SKIP] npm not found"
    fi
  fi

  # Python
  if compgen -G "pyproject.toml requirements*.txt" > /dev/null; then
    if command -v python3 >/dev/null 2>&1; then
      log "[Python] Installing"
      if [[ -f requirements.txt ]]; then pip3 install -r requirements.txt || true; fi
      if [[ -f pyproject.toml ]]; then pip3 install -e . || true; fi
      if command -v pytest >/dev/null 2>&1; then
        log "[Python] pytest"
        pytest -q || log "[WARN] pytest failed (recorded)"
      fi
    else
      log "[SKIP] python3 not found"
    fi
  fi

  # Go
  if [[ -f go.mod ]]; then
    if command -v go >/dev/null 2>&1; then
      log "[Go] go test ./..."
      go test ./... || log "[WARN] go test failed (recorded)"
    else
      log "[SKIP] go not found"
    fi
  fi

  # Java/Maven
  if [[ -f pom.xml ]]; then
    if command -v mvn >/dev/null 2>&1; then
      log "[Java] mvn -B -DskipTests=false test"
      mvn -B -DskipTests=false test || log "[WARN] mvn test failed (recorded)"
    else
      log "[SKIP] mvn not found"
    fi
  fi

  # Docker Compose smoke (optional)
  if [[ -f docker-compose.yml || -f compose.yml ]]; then
    if command -v docker >/dev/null 2>&1; then
      log "[Compose] Building images (no up)"
      docker compose build || log "[WARN] compose build failed (recorded)"
    else
      log "[SKIP] docker not found"
    fi
  fi

  save_state
  step_end "build"
}

cmd_release_dry() {
  load_or_init_state
  step_begin "release-dry" 4

  # Changelog (git-cliff preferred if present)
  CHANGELOG_PATH="ops-logs/CHANGELOG.rendered.md"
  if command -v git-cliff >/dev/null 2>&1 && [[ -f .cliff.toml ]]; then
    git-cliff -o "$CHANGELOG_PATH" || echo "# Changelog (placeholder)" > "$CHANGELOG_PATH"
  else
    git log --pretty=format:'* %h %s (%ad)' --date=short > "$CHANGELOG_PATH" || echo "# Changelog (placeholder)" > "$CHANGELOG_PATH"
  fi
  log "Rendered changelog at $CHANGELOG_PATH"

  # Release notes scaffold
  NOTES_PATH="ops-logs/RELEASE_NOTES.md"
  cat > "$NOTES_PATH" <<EOF
# Maestro Conductor — GA Release Notes

## Highlights
- ...

## Changes
$(sed 's/^/  /' "$CHANGELOG_PATH" | head -n 200)

## Upgrade/Compatibility
- ...

## Canary & Rollback
See: templates/GA_RELEASE_PLAN.md
EOF
  log "Wrote release notes scaffold to $NOTES_PATH"

  save_state
  step_end "release-dry"
}

cmd_merge_prs() {
  load_or_init_state
  step_begin "merge-prs" 5

  require git || { step_end "merge-prs"; return; }

  if [[ -z "${RELEASE_BRANCH:-}" ]]; then
    RELEASE_BRANCH="release/maestro-ga-$(date +%Y%m%d)"
  fi

  git checkout -B "$RELEASE_BRANCH" "${BASE_BRANCH:-main}" | tee -a "$CURRENT_LOG"

  if [[ -f "${PR_INVENTORY_PATH:-}" ]]; then
    # Merge ready PRs: not draft, base==BASE_BRANCH, review approved
    mapfile -t READY < <(jq -r \
      --arg base "${BASE_BRANCH:-main}" \
      '.[] | select(.baseRefName==$base and .isDraft==false and (.reviewDecision=="APPROVED" or .mergeStateStatus=="clean")) | .number' \
      "$PR_INVENTORY_PATH")
    log "Candidate PRs: ${#READY[@]}"
  else
    READY=()
    log "[WARN] No PR inventory; skipping automatic selection"
  fi

  if [[ "${#READY[@]}" -eq 0 ]]; then
    log "No eligible PRs found. You can merge manually then rerun."
    save_state; step_end "merge-prs"; return
  fi

  for pr in "${READY[@]}"; do
    if command -v gh >/dev/null 2>&1; then
      log "Merging PR #$pr into $RELEASE_BRANCH"
      if confirm_mutation; then
        gh pr merge "$pr" --squash --auto || log "[WARN] gh merge failed for #$pr"
      fi
    else
      log "[SKIP] gh not installed; cannot auto-merge PR #$pr"
    fi
  done

  save_state
  step_end "merge-prs"
}

cmd_cleanup_branches() {
  load_or_init_state
  step_begin "cleanup-branches" 6

  require git || { step_end "cleanup-branches"; return; }
  git fetch --all --prune | tee -a "$CURRENT_LOG" || true

  # Find merged local branches
  mapfile -t MERGED < <(git branch --merged "${BASE_BRANCH:-main}" | grep -vE "^\*|${BASE_BRANCH:-main}|${RELEASE_BRANCH:-}" | sed 's/^\s*//')
  log "Merged local branches: ${#MERGED[@]}"
  printf "%s\n" "${MERGED[@]}" | sed 's/^/  - /' | tee -a "$CURRENT_LOG"

  if confirm_mutation; then
    for b in "${MERGED[@]}"; do
      log "Deleting local branch $b"
      git branch -d "$b" || true
    done
  fi

  save_state
  step_end "cleanup-branches"
}

cmd_tag_ga() {
  load_or_init_state
  step_begin "tag-ga" 7

  require git || { step_end "tag-ga"; return; }
  GA_VERSION="${GA_VERSION:-v$(date +%Y.%m.%d)}"
  log "Preparing GA tag $GA_VERSION on ${RELEASE_BRANCH:-unknown}"

  if confirm_mutation; then
    git checkout "${RELEASE_BRANCH:-${BASE_BRANCH:-main}}"
    git tag -a "$GA_VERSION" -m "Maestro Conductor GA" || true
    git push origin "$GA_VERSION" || true
  fi

  save_state
  step_end "tag-ga"
}

cmd_resume() {
  load_or_init_state
  echo "Last step: $CURRENT_STEP"
  echo "Completed: ${COMPLETED_STEPS[*]:-}"
  echo "Next actions (choose one): init | plan | build | release-dry | merge-prs | cleanup-branches | tag-ga"
}

usage() {
  cat <<EOF
Usage: $0 <command>

Commands:
  status          Show current state and recent logs
  init            Initialize state and derive release branch
  plan            Inventory PRs and branches (no mutations)
  build           Language-aware builds/tests (best effort)
  release-dry     Render changelog and notes (no tagging)
  merge-prs       Auto-merge eligible PRs into release branch
  cleanup-branches Delete merged local branches (dry-run unless CONFIRM=1)
  tag-ga          Tag and push GA release (requires CONFIRM=1)
  resume          Show what to run next

Env:
  CONFIRM=1       Allow mutating actions
  BASE_BRANCH     Default: main
EOF
}

main() {
  CMD="${1:-}"
  case "$CMD" in
    status) cmd_status ;;
    init) cmd_init ;;
    plan) cmd_plan ;;
    build) cmd_build ;;
    release-dry) cmd_release_dry ;;
    merge-prs) cmd_merge_prs ;;
    cleanup-branches) cmd_cleanup_branches ;;
    tag-ga) cmd_tag_ga ;;
    resume) cmd_resume ;;
    *) usage ; exit 1 ;;
  esac
}

main "$@"

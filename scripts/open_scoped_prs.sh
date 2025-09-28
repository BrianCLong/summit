#!/usr/bin/env bash
set -euo pipefail

INITIAL_BRANCHES=("feat/mstc" "feat/trr" "feat/opa")
RUN_INITIAL=false
RUN_ALL=false
RUN_VERIFY=false
SKIP_SANITIZE=false
STARTING_BRANCH=""

usage() {
  cat <<'USAGE'
Usage: scripts/open_scoped_prs.sh [options]

Options:
  --initial       Run the fast-path flow for the initial MSTC/TRR/OPA branches.
  --all           Iterate over every local branch with diffs vs origin/main.
  --verify        After opening PRs, show the latest scoped CI workflow runs.
  --skip-sanitize Skip the pr_sanitize.sh step (not recommended).
  -h, --help      Show this help message.

If no options are provided the script runs the initial flow only.
USAGE
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "::error::$cmd is required but was not found in PATH" >&2
    exit 1
  fi
}

fetch_main() {
  git fetch --all --prune
  git fetch origin
}

sanitize_repo() {
  if [[ "$SKIP_SANITIZE" == true ]]; then
    return 0
  fi
  if [[ -x scripts/pr_sanitize.sh ]]; then
    bash scripts/pr_sanitize.sh || true
  else
    echo "::warning::scripts/pr_sanitize.sh not found or not executable; skipping sanitize" >&2
  fi
}

restore_branch() {
  local branch="$1"
  if [[ -z "$branch" ]]; then
    return 0
  fi
  if git rev-parse --verify --quiet "refs/heads/$branch" >/dev/null 2>&1; then
    if [[ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" != "$branch" ]]; then
      git checkout "$branch" >/dev/null 2>&1 || true
    fi
  fi
}

uppercase_scope() {
  local branch="$1"
  local scope
  scope="${branch#*/}"
  if [[ "$scope" == "$branch" ]]; then
    scope="$branch"
  fi
  printf '%s' "${scope^^}"
}

create_pr() {
  local branch="$1"
  local title="$2"
  local labels="$3"
  local body="$4"
  local body_file="$5"
  local -a label_args=()

  IFS=',' read -r -a label_list <<< "$labels"
  for label in "${label_list[@]}"; do
    if [[ -n "$label" ]]; then
      label_args+=("--label" "$label")
    fi
  done

  if gh pr view --head "$branch" >/dev/null 2>&1; then
    echo "ℹ️  PR already exists for $branch; skipping create"
    return 0
  fi

  local -a gh_args=("--title" "$title" "--base" "main" "--head" "$branch")

  if [[ -n "$body_file" ]]; then
    gh_args+=("--body-file" "$body_file")
  else
    gh_args+=("--body" "$body")
  fi

  gh_args+=("${label_args[@]}")

  gh pr create "${gh_args[@]}"
}

push_branch() {
  local branch="$1"
  git push --force-with-lease -u origin "$branch"
}

rebase_branch() {
  local branch="$1"
  if ! git rebase origin/main; then
    echo "⚠️  Rebase conflict on $branch. Resolve manually and re-run." >&2
    git rebase --abort >/dev/null 2>&1 || true
    return 1
  fi
  return 0
}

process_branch() {
  local branch="$1"
  local title="$2"
  local labels="$3"
  local body="$4"
  local body_file="$5"

  if ! git checkout "$branch" >/dev/null 2>&1; then
    echo "⏭️  $branch does not exist locally; skipping"
    return 0
  fi

  sanitize_repo
  git fetch origin
  if ! rebase_branch "$branch"; then
    return 0
  fi
  push_branch "$branch"
  create_pr "$branch" "$title" "$labels" "$body" "$body_file"
}

run_initial_flow() {
  echo "==> Running initial scoped branches"
  for branch in "${INITIAL_BRANCHES[@]}"; do
    local scope_upper
    scope_upper=$(uppercase_scope "$branch")
    local title="[$scope_upper] Scoped CI: ready for review"
    process_branch "$branch" "$title" "ci:scoped,ready-for-ci" "" "docs/pr-runbook-card.md"
  done
}

run_all_flow() {
  echo "==> Running fan-out across all branches"
  while IFS= read -r branch; do
    [[ -n "$branch" ]] || continue
    if [[ "$branch" == "main" ]]; then
      continue
    fi
    if ! git show-ref --verify --quiet "refs/heads/$branch"; then
      echo "⏭️  Unable to locate $branch locally; skipping"
      continue
    fi
    git fetch origin
    local rev_range="origin/main...$branch"
    if git diff --quiet "$rev_range"; then
      echo "⏭️  $branch has no meaningful diff vs origin/main"
      continue
    fi
    process_branch "$branch" "[$branch] Ready for scoped CI" "ready-for-ci" "Auto-opened via PR sanitize flow. See docs/pr-runbook-card.md for lanes & smoke." ""
  done < <(git for-each-ref --format='%(refname:short)' refs/heads)
}

verify_scoped_runs() {
  echo "==> Latest scoped CI workflow runs"
  local workflows=(ci.pr.mstc.yml ci.pr.trr.yml ci.pr.opa.yml)
  for wf in "${workflows[@]}"; do
    gh run list --limit 10 --workflow "$wf"
  done
  gh run view --job detect-paths --log || true
}

main() {
  if [[ $# -eq 0 ]]; then
    RUN_INITIAL=true
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --initial)
        RUN_INITIAL=true
        ;;
      --all)
        RUN_ALL=true
        ;;
      --verify)
        RUN_VERIFY=true
        ;;
      --skip-sanitize)
        SKIP_SANITIZE=true
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
    shift
  done

  require_command git
  require_command gh

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "::error::scripts/open_scoped_prs.sh must be run inside a Git repository" >&2
    exit 1
  fi

  local root
  root="$(git rev-parse --show-toplevel)"
  cd "$root"

  STARTING_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  trap 'restore_branch "$STARTING_BRANCH"' EXIT

  fetch_main

  if [[ "$RUN_INITIAL" == true ]]; then
    run_initial_flow
  fi

  if [[ "$RUN_ALL" == true ]]; then
    run_all_flow
  fi

  if [[ "$RUN_VERIFY" == true ]]; then
    verify_scoped_runs
  fi
}

main "$@"

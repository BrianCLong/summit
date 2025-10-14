#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/scoped_ci_automation.sh [branch...]

Automates the scoped CI preparation workflow:
  * fetches/prunes refs
  * checks out each branch (fetching from origin if needed)
  * runs scripts/pr_sanitize.sh when available
  * rebases the branch onto origin/main
  * force-pushes with lease back to origin
  * opens a pull request via GitHub CLI when installed

Without arguments the default branch set is: feat/mstc feat/trr feat/opa.
USAGE
}

log() {
  printf '==> %s\n' "$1"
}

warn() {
  printf 'WARNING: %s\n' "$1" >&2
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Ensure we run from the repository root so relative paths resolve.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  warn "This script must be executed inside a git repository."
  exit 1
fi

default_branches=("feat/mstc" "feat/trr" "feat/opa")
branches=()
if [[ $# -gt 0 ]]; then
  branches=("$@")
else
  branches=("${default_branches[@]}")
fi

if [[ ${#branches[@]} -eq 0 ]]; then
  warn "No branches supplied. Nothing to do."
  exit 0
fi

starting_branch="$(git rev-parse --abbrev-ref HEAD)"
cleanup() {
  if git rev-parse --abbrev-ref HEAD >/dev/null 2>&1 && [[ "$(git rev-parse --abbrev-ref HEAD)" != "$starting_branch" ]]; then
    git checkout "$starting_branch" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

log "Fetching all remotes with prune"
git fetch --all --prune

missing_branches=()
rebase_failures=()
gh_unavailable=false

sanitize_script="$REPO_ROOT/scripts/pr_sanitize.sh"

for branch in "${branches[@]}"; do
  log "Processing $branch"

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git checkout "$branch"
  elif git ls-remote --exit-code origin "$branch" >/dev/null 2>&1; then
    log "Fetching $branch from origin"
    git fetch origin "$branch:$branch"
    git checkout "$branch"
  else
    warn "Branch $branch not found locally or on origin. Skipping."
    missing_branches+=("$branch")
    continue
  fi

  if [[ -x "$sanitize_script" ]]; then
    log "Running pr sanitize script"
    if ! bash "$sanitize_script"; then
      warn "pr_sanitize.sh failed on $branch (continuing)."
    fi
  else
    warn "Sanitize script not found or not executable at $sanitize_script"
  fi

  log "Fetching latest origin/main"
  git fetch origin main

  if ! git rebase origin/main; then
    warn "Rebase failed for $branch. Aborting rebase and continuing."
    git rebase --abort >/dev/null 2>&1 || true
    rebase_failures+=("$branch")
    continue
  fi

  log "Pushing $branch with force-with-lease"
  git push --force-with-lease -u origin "$branch"

  if command_exists gh; then
    title_scope="$(echo "$branch" | cut -d/ -f2 | tr '[:lower:]' '[:upper:]')"
    if [[ -z "$title_scope" ]]; then
      title_scope="UNKNOWN"
    fi
    log "Creating pull request for $branch"
    if ! gh pr create \
      --title "[${title_scope}] Scoped CI: ready for review" \
      --body-file docs/pr-runbook-card.md \
      --label "ci:scoped" \
      --label "ready-for-ci" \
      --base main \
      --head "$branch"; then
      warn "Failed to create PR for $branch via gh CLI."
    fi
  else
    gh_unavailable=true
    warn "GitHub CLI not found; skipping PR creation for $branch."
  fi

done

if ((${#missing_branches[@]})); then
  printf '\nThe following branches were not processed because they are missing:%s\n' "" >&2
  for branch in "${missing_branches[@]}"; do
    printf '  - %s\n' "$branch" >&2
  done
fi

if ((${#rebase_failures[@]})); then
  printf '\nRebase failed on these branches (manual intervention required):%s\n' "" >&2
  for branch in "${rebase_failures[@]}"; do
    printf '  - %s\n' "$branch" >&2
  done
fi

if [[ "$gh_unavailable" == true ]]; then
  warn "Install GitHub CLI (https://cli.github.com/) and authenticate to enable PR creation and workflow inspection."
fi

if command_exists gh; then
  log "Listing latest scoped CI runs (requires gh CLI workflows access)"
  gh run list --limit 10 --workflow ci.pr.mstc.yml || warn "Unable to list ci.pr.mstc.yml runs"
  gh run list --limit 10 --workflow ci.pr.trr.yml || warn "Unable to list ci.pr.trr.yml runs"
  gh run list --limit 10 --workflow ci.pr.opa.yml || warn "Unable to list ci.pr.opa.yml runs"
  gh run view --job detect-paths --log || warn "Unable to display detect-paths job log"
else
  warn "GitHub CLI unavailable: skipping workflow inspection commands."
fi

log "Scoped CI automation completed."

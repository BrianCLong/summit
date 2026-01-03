#!/usr/bin/env sh
set -euo pipefail

usage() {
  echo "Usage: $0 wt-new <branch> | wt-rm" >&2
}

require_git_repo() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "This command must be run inside a git repository." >&2
    exit 1
  fi
}

wt_new() {
  branch=${1-}
  if [ -z "$branch" ]; then
    usage
    exit 1
  fi

  require_git_repo
  repo_root=$(git rev-parse --show-toplevel)
  base=$(basename "$repo_root")
  parent_dir=$(dirname "$repo_root")
  worktree_path="${parent_dir}/${base}--${branch}"

  if [ -e "$worktree_path" ]; then
    echo "Worktree path already exists: $worktree_path" >&2
    exit 1
  fi

  if git show-ref --verify --quiet "refs/heads/${branch}"; then
    git worktree add "$worktree_path" "$branch"
  else
    git worktree add -b "$branch" "$worktree_path"
  fi

  if command -v mise >/dev/null 2>&1; then
    if ! mise trust "$worktree_path"; then
      echo "Warning: 'mise trust' failed for $worktree_path" >&2
    fi
  fi

  echo "$worktree_path"
}

confirm() {
  if command -v gum >/dev/null 2>&1; then
    if ! gum confirm "Remove worktree and branch?"; then
      return 1
    fi
  else
    printf "Remove worktree and branch? [y/N] "
    read -r answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
      return 1
    fi
  fi
}

wt_rm() {
  require_git_repo
  current_worktree_root=$(git rev-parse --show-toplevel)
  name=$(basename "$current_worktree_root")
  root="${name%%--*}"
  branch="${name#*--}"

  if [ "$root" = "$name" ] || [ -z "$branch" ]; then
    echo "Current directory is not inside a worktree named <root>--<branch>; aborting." >&2
    exit 1
  fi

  if ! confirm; then
    echo "Aborted by user." >&2
    exit 1
  fi

  parent_dir=$(dirname "$current_worktree_root")
  original_repo_root="${parent_dir}/${root}"

  if [ ! -d "$original_repo_root/.git" ]; then
    echo "Original repo root not found at $original_repo_root; aborting." >&2
    exit 1
  fi

  (
    cd "$original_repo_root"
    git worktree remove "$current_worktree_root" --force
    git branch -D "$branch"
  )
}

command=${1-}
case "$command" in
  wt-new)
    shift
    wt_new "$@"
    ;;
  wt-rm)
    wt_rm
    ;;
  *)
    usage
    exit 1
    ;;
esac

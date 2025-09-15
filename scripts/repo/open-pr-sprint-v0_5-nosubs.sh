#!/usr/bin/env bash
# Open multiple PRs without command substitution; POSIX/bash safe.
set -euo pipefail

MANIFEST="${1:-scripts/repo/prs.v0_5.tsv}"  # head|base|title|body_file_or_text
BASE_BRANCH="${BASE_BRANCH:-main}"
LABELS="${LABELS:-sprint-v0_5,pr-dashboard}"
ASSIGNEES="${ASSIGNEES:-}"   # comma-separated
REVIEWERS="${REVIEWERS:-}"   # comma-separated
DRAFT="${DRAFT:-false}"
DRY_RUN="${DRY_RUN:-false}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 127; }; }
need gh; need git

echo "[check] gh auth"
gh auth status >/dev/null 2>&1 || { echo "Run: gh auth login"; exit 1; }

[ -r "$MANIFEST" ] || { echo "Manifest not readable: $MANIFEST"; exit 2; }

line_no=0
while IFS='|' read -r HEAD BASE TITLE BODY; do
  line_no=$((line_no+1))
  case "$HEAD" in ''|#*) continue ;; esac
  [ -n "$BASE" ] || BASE="$BASE_BRANCH"

  if ! git ls-remote --heads origin "$HEAD" | grep -q "$HEAD"; then
    echo "[skip] remote head missing: $HEAD (line $line_no)"
    continue
  fi

  if gh pr list --head "$HEAD" --state all --json number | grep -q '"number"'; then
    echo "[skip] PR already exists for $HEAD"
    continue
  fi

  echo "[plan] $HEAD -> $BASE | $TITLE"

  cmd=(gh pr create -H "$HEAD" -B "$BASE")
  if [ "$DRAFT" = "true" ]; then cmd+=("--draft"); fi
  if [ -n "$TITLE" ]; then cmd+=(-t "$TITLE"); else cmd+=("--fill"); fi

  if [ -n "$BODY" ]; then
    case "$BODY" in
      @*) 
        BODY_PATH="${BODY#@}"
        if [ -r "$BODY_PATH" ]; then
          cmd+=(--body-file "$BODY_PATH")
        else
          cmd+=(--fill)
        fi
        ;; 
      *)
        cmd+=(-b "$BODY")
        ;; 
    esac
  fi

  [ -n "$LABELS" ] && cmd+=(--label "$LABELS")
  [ -n "$REVIEWERS" ] && cmd+=(--reviewer "$REVIEWERS")
  [ -n "$ASSIGNEES" ] && cmd+=(--assignee "$ASSIGNEES")

  if [ "$DRY_RUN" = "true" ]; then
    printf 'DRY: ' && printf '%q ' "${cmd[@]}" && printf '\n'
  else
    "${cmd[@]}"
  fi
done < "$MANIFEST"

echo "[done] processed manifest: $MANIFEST"

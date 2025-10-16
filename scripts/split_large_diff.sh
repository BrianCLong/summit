set -euo pipefail
#!/usr/bin/env bash
set -euo pipefail

# Split a large diff into multiple PRs by top-level category and open PREP PRs.
# Categories: apps/, services/, packages/, contracts/, infra/ (.github, infra, helm, terraform, deploy)
# Usage: scripts/split_large_diff.sh [base_branch]
# - Assumes current branch is the source. Uses gh CLI to open PRs.
# - Requires a clean working tree.

BASE=${1:-origin/main}
SRC=$(git rev-parse --abbrev-ref HEAD)
MAX_FILES=${MAX_FILES:-200}

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree not clean. Commit/stash before running." >&2
  exit 2
fi

git fetch origin --prune || true

CHANGED=$(git diff --name-only "$BASE"...HEAD || true)
COUNT=$(printf '%s
' "$CHANGED" | wc -l | tr -d ' ')
if [ "$COUNT" -le "$MAX_FILES" ]; then
  echo "Diff size $COUNT <= $MAX_FILES; no split needed."
  exit 0
fi
if [ -z "$CHANGED" ]; then
  echo "No changes vs $BASE; nothing to split."; exit 0; fi

# Group files
apps=(); services=(); packages=(); contracts=(); infra=()
while IFS= read -r f; do
  case "$f" in
    apps/*) apps+=("$f") ;;
    services/*) services+=("$f") ;;
    packages/*) packages+=("$f") ;;
    contracts/*) contracts+=("$f") ;;
    .github/*|infra/*|helm/*|terraform/*|deploy/*) infra+=("$f") ;;
  esac
done <<< "$CHANGED"

open_split(){
  local group="$1"; shift
  local -a files=("$@")
  [ ${#files[@]} -gt 0 ] || return 0
  local new="split/${SRC}/${group}"
  echo "==> Creating split branch $new for ${#files[@]} files"
  git checkout -B "$new" "$BASE"
  # Bring over files from source branch
  git checkout "$SRC" -- "${files[@]}"
  git add -A
  git commit -m "chore(split): ${group} subset from ${SRC} (auto-split)"
  git push --force-with-lease -u origin "$new"
  # Open PR
  title="[SPLIT] ${group}: ${SRC}"
  case "$group" in
    apps) LABELS="area/ui" ;;
    services) LABELS="area/services" ;;
    packages) LABELS="area/sdk" ;;
    contracts) LABELS="area/policy" ;;
    infra) LABELS="area/infra" ;;
    *) LABELS="" ;;
  esac
  body=$(mktemp)
  {
    echo "This PR contains the ${group} subset from ${SRC}."
    echo
    orig=$(gh pr list --head "$SRC" --json number,url -q '.[0].url' 2>/dev/null || true)
    if [ -n "$orig" ]; then
      echo "Original PR: $orig"
    else
      echo "Branch: $SRC (no original PR detected)"
    fi
    echo
    echo "Files (${#files[@]}):"
    for f in "${files[@]}"; do echo "- $f"; done | sed -n '1,200p'
  } > "$body"
  if [ -n "$LABELS" ]; then
    gh pr create --title "$title" --body-file "$body" --base main --head "$new" --label "$LABELS" || true
  else
    gh pr create --title "$title" --body-file "$body" --base main --head "$new" || true
  fi
  rm -f "$body"
}

open_split apps "${apps[@]:-}"
open_split services "${services[@]:-}"
open_split packages "${packages[@]:-}"
open_split contracts "${contracts[@]:-}"
open_split infra "${infra[@]:-}"

echo "All split PRs opened (or attempted)."

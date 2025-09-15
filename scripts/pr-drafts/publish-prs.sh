#!/usr/bin/env bash
set -euo pipefail

# ... (argument parsing from previous version) ...
while [[ $# -gt 0 ]]; do
  case "$1" in
    -B|--base) BASE_BRANCH="$2"; shift 2;;
    --labels) LABELS="$2"; shift 2;;
    --milestone) MILESTONE="$2"; shift 2;;
    --repo) REPO="$2"; shift 2;;
    --embed-shared) EMBED_SHARED=true; shift;;
    *) exit 1;;
  esac
done

WAVE="v25"
BASE_DIR="project_management/pr_drafts/${WAVE}"

shopt -s nullglob
for f in "$BASE_DIR"/PR-*.md; do
  echo "==> Processing draft: $f"

  title=$(grep -m 1 '^# ' "$f" | sed 's/^# //')
  body=$(sed '1,/^# /d' "$f")
  
  # Simplified and robust slug generation
  slug=$(basename "$f" | sed 's/\.md$//' | sed 's/^PR-[0-9]*-//' | tr -cs 'a-zA-Z0-9' '-')
  branch_name="feature/${WAVE}/${slug}"

  echo "  - Title: $title"
  echo "  - Slug: $slug"
  echo "  - Branch: $branch_name"

  if [ -z "$slug" ]; then
    echo "Error: Slug is empty, cannot create branch." >&2
    exit 1
  fi

  git checkout "$BASE_BRANCH"
  git checkout -b "$branch_name"
  touch ".prout/${slug}.tmp"
  git add ".prout/${slug}.tmp"
  git commit -m "feat(${WAVE}): initial commit for ${slug}" --allow-empty
  git push -u origin "$branch_name"

  gh pr create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$LABELS" \
    --milestone "$MILESTONE" \
    --base "$BASE_BRANCH" \
    --head "$branch_name"

  git checkout "$BASE_BRANCH"
done

echo ">= All PRs for wave ${WAVE} published."

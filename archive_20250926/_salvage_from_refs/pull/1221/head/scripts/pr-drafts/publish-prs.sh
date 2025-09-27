#!/usr/bin/env bash
set -euo pipefail

# Publish multiple PRs from markdown drafts with optional shared sections.
# Requires: gh CLI, git remote pointing to GitHub.

usage() {
  cat <<USAGE
Usage: $0 [-d drafts_dir] [-B base] [-H head] [--ready|--draft] \
          [--labels "l1,l2"] [--milestone M] [--embed-shared] [--repo owner/repo] [--dry-run]

Defaults:
  -d project_management/pr_drafts/v24
  -B main (fallback if not a branch)
  -H current branch (git rev-parse --abbrev-ref HEAD)
  --draft by default

Examples:
  $0 --labels "v24,platform" --milestone "v24" --embed-shared
  $0 -B main -H feature/runtime-unify --ready --labels "runtime,node"
USAGE
}

DIR=${1:-}
BASE="main"
HEAD="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"
DRAFT_FLAG="--draft"
LABELS=""
MILESTONE=""
EMBED_SHARED=0
REPO=""
DRY_RUN=0

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir) DIR="$2"; shift 2 ;;
    -B|--base) BASE="$2"; shift 2 ;;
    -H|--head) HEAD="$2"; shift 2 ;;
    --ready) DRAFT_FLAG=""; shift ;;
    --draft) DRAFT_FLAG="--draft"; shift ;;
    --labels) LABELS="$2"; shift 2 ;;
    --milestone) MILESTONE="$2"; shift 2 ;;
    --embed-shared) EMBED_SHARED=1; shift ;;
    --repo) REPO="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) shift ;;
  esac
done

if [[ -z "$DIR" ]]; then DIR="project_management/pr_drafts/v24"; fi
if [[ -z "$REPO" ]]; then
  url=$(git config --get remote.origin.url || true)
  if [[ "$url" =~ github.com[/:]([^/]+)/([^/.]+) ]]; then
    REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  fi
fi

if ! command -v gh >/dev/null; then echo "❌ gh CLI not found"; exit 1; fi

mapfile -t FILES < <(ls -1 "$DIR"/PR-*.md 2>/dev/null | sort)
if [[ ${#FILES[@]} -eq 0 ]]; then echo "❌ No PR drafts in $DIR"; exit 1; fi

SHARED="$DIR/SHARED-SECTIONS.md"

for f in "${FILES[@]}"; do
  [[ $(basename "$f") == "SHARED-SECTIONS.md" ]] && continue
  title=$(grep -m1 '^# ' "$f" | sed 's/^# \s*//')
  if [[ -z "$title" ]]; then title=$(basename "$f" .md | sed 's/PR-[0-9]*-//; s/-/ /g'); fi

  tmp=$(mktemp)
  if [[ $EMBED_SHARED -eq 1 && -f "$SHARED" ]]; then
    if ! grep -q "SHARED-SECTIONS.md" "$f"; then
      { cat "$f"; echo -e "\n---\n"; cat "$SHARED"; } > "$tmp"
    else
      cat "$f" > "$tmp"
    fi
  else
    cat "$f" > "$tmp"
  fi

  args=(pr create --title "$title" --body-file "$tmp" --base "$BASE" --head "$HEAD")
  if [[ -n "$DRAFT_FLAG" ]]; then args+=("$DRAFT_FLAG"); fi
  IFS=',' read -ra LARR <<< "$LABELS"
  for l in "${LARR[@]}"; do [[ -n "$l" ]] && args+=(--label "$l"); done
  [[ -n "$MILESTONE" ]] && args+=(--milestone "$MILESTONE")
  [[ -n "$REPO" ]] && args+=(--repo "$REPO")

  echo "\n📝 Creating PR from: $f"
  echo "   Title: $title"
  echo "   Base: $BASE  Head: $HEAD  Repo: ${REPO:-current}  Draft: ${DRAFT_FLAG:+yes}${DRAFT_FLAG:+'no'}"
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "   (dry-run) gh ${args[*]}"
  else
    gh "${args[@]}"
  fi
  rm -f "$tmp"

done

echo "✅ Done."


#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DRAFT_DIR="${DRAFT_DIR:-$ROOT_DIR/project_management/pr_drafts/v24}"
REPO="${REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '')}"
EDITOR_BIN="${EDITOR:-vi}"
DEFAULT_LABELS="${PR_LABELS:-canary,migration,risk:high,needs:arch-review,compliance}"
DEFAULT_MILESTONE="${PR_MILESTONE:-Sprint 2025-09-15}"
DRAFT_FLAG="${PR_DRAFT:-true}"

usage(){
  cat <<USAGE
Usage: $(basename "$0") <cmd> [args]
Commands:
  list                      List available PR drafts
  edit <num>                Open draft N in \$EDITOR
  publish <num>             Create a draft PR from PR-N markdown
  publish-all               Create draft PRs for all markdowns
  preview <num>             Show parsed title/body for draft N

Env:
  REPO=<owner/repo>         Default: current repo (via gh)
  PR_LABELS=csv             Default: $DEFAULT_LABELS
  PR_MILESTONE=name         Default: $DEFAULT_MILESTONE
  PR_DRAFT=true|false       Default: $DRAFT_FLAG
USAGE
}

require_gh(){ command -v gh >/dev/null || { echo "gh CLI is required"; exit 1; }; }

draft_path(){ printf "%s/PR-%02d" "$DRAFT_DIR" "$1"; }

list(){
  ls -1 "$DRAFT_DIR"/PR-*.md | nl -w2 -s': '
}

edit(){ local n=$1; "$EDITOR_BIN" "$(draft_path "$n").md"; }

parse(){
  # Args: N -> outputs TITLE and BODY to stdout (body after Title: line)
  local n=$1 f="$(draft_path "$n").md"
  [ -f "$f" ] || { echo "Missing $f"; return 1; }
  local title body
  title=$(grep -m1 '^Title:' "$f" | sed 's/^Title:[[:space:]]*//')
  body=$(awk 'BEGIN{p=0} /^Title:/{p=1; next} {print}' "$f")
  printf '%s\n---BODY---\n%s\n' "$title" "$body"
}

preview(){
  local n=$1; parse "$n" | awk 'BEGIN{p=0} /^---BODY---$/{p=1; next} {if(!p){print "Title: "$0} else print}'
}

publish(){
  require_gh
  local n=$1 f="$(draft_path "$n").md"
  [ -f "$f" ] || { echo "Missing $f"; exit 1; }
  local title body
  readarray -t parsed < <(parse "$n")
  local i sep_seen=0
  for i in "${parsed[@]}"; do
    if [[ "$i" == "---BODY---" ]]; then sep_seen=1; continue; fi
    if [[ $sep_seen -eq 0 ]]; then title="$i"; else body+="$i\n"; fi
  done
  local draft_flag
  draft_flag=$([[ "$DRAFT_FLAG" == "true" ]] && echo "--draft" || echo "")
  local -a lbls
  IFS=',' read -r -a lbls <<<"$DEFAULT_LABELS"
  local lbl_args=()
  for l in "${lbls[@]}"; do lbl_args+=("--label" "$l"); done
  if [[ -n "$REPO" ]]; then repo_args=("-R" "$REPO"); else repo_args=(); fi
  echo "Creating PR: $title"
  gh pr create "${repo_args[@]}" $draft_flag --title "$title" --body "$body" "${lbl_args[@]}" --milestone "$DEFAULT_MILESTONE"
}

publish_all(){
  local f n
  for f in "$DRAFT_DIR"/PR-*.md; do
    n=$(basename "$f" | sed -E 's/PR-([0-9]+).*/\1/')
    publish "$n"
  done
}

cmd=${1:-}
case "$cmd" in
  list) list ;;
  edit) shift; edit "${1:?num}" ;;
  publish) shift; publish "${1:?num}" ;;
  publish-all) publish_all ;;
  preview) shift; preview "${1:?num}" ;;
  *) usage; exit 1 ;;
esac


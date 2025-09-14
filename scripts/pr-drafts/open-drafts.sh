#!/usr/bin/env bash
set -euo pipefail
DIR="${1:-project_management/pr_drafts/v24}"
EDITOR_CMD="${EDITOR:-}"; [[ -z "$EDITOR_CMD" ]] && EDITOR_CMD="${VISUAL:-}"; [[ -z "$EDITOR_CMD" ]] && EDITOR_CMD="vi"

shopt -s nullglob
for f in "$DIR"/PR-*.md; do
  [[ $(basename "$f") == "SHARED-SECTIONS.md" ]] && continue
  echo "Opening $f"
  "$EDITOR_CMD" "$f"
 done


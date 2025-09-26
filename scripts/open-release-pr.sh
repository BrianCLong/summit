#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-main}"
HEAD="${2:-release/assistant-v1}"
TITLE="${3:-Release: IntelGraph Assistant v1}"
BODY_FILE="${4:-.github/PR_BODY_release-assistant-v1.md}"
LABELS="${LABELS:-release,assistant}"
REVIEWERS="${REVIEWERS:-}"

command -v gh >/dev/null || { echo "Install GitHub CLI (gh)"; exit 1; }
test -f "$BODY_FILE" || { echo "Missing $BODY_FILE"; exit 1; }

ARGS=(pr create --base "$BASE" --head "$HEAD" --title "$TITLE" --body-file "$BODY_FILE" --fill)
[ -n "$LABELS" ] && ARGS+=(--label "$LABELS")
[ -n "$REVIEWERS" ] && ARGS+=(--reviewer "$REVIEWERS")

gh "${ARGS[@]}"

echo "✅ Opened PR $HEAD → $BASE"


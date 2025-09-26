#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-v1.0.0-assistant}"
BRANCH="${2:-release/assistant-v1}"
NOTES_FILE="${3:-.github/releases/${TAG}.md}"

# sanity
test -f "$NOTES_FILE" || { echo "Missing $NOTES_FILE"; exit 1; }
git diff --quiet || { echo "Working tree not clean"; exit 1; }

# PR gate tests (constrained runner-friendly)
WITH_ASSISTANT=${WITH_ASSISTANT:-0} pnpm install
WITH_ASSISTANT=${WITH_ASSISTANT:-0} pnpm run test:all

# branch + push
git checkout -b "$BRANCH"
git push -u origin "$BRANCH"

# tag + push (annotated from notes file)
git tag -a "$TAG" -F "$NOTES_FILE"
git push origin "$TAG"

echo "✅ Pushed $BRANCH and $TAG"


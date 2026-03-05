#!/usr/bin/env bash
set -euo pipefail
blocked=(
  "^\.claude/" "^\.grok/" "^\.gemini/" "^\.jules/" "^\.qwen/" "^\.qwen-cache/"
  "^\.maestro/" "^\.windsurf/" "^\.cursor/" "^\.vale/" "^\.zap/"
  "^\.agent-guidance/" "^\.agentic-prompts/" "^\.archive/" "^\.disabled/" "^\.quarantine/"
  "^\.summit/" "^\.mc/" "^\.merge-captain/" "^\.prbodies/" "^\.githooks/" "^\.husky/"
)
files="$(git ls-files || true)"
for pat in "${blocked[@]}"; do
  if echo "$files" | grep -E -q "$pat"; then
    echo "ERROR: tracked bloat directory detected matching $pat"
    exit 1
  fi
done
echo "OK: no tracked bloat dirs"

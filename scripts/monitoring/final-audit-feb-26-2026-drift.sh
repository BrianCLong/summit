#!/usr/bin/env bash
set -euo pipefail

echo "[drift] checking .env.example exists"
test -f ".env.example"

echo "[drift] checking .env is not tracked"
if git ls-files --error-unmatch ".env" >/dev/null 2>&1; then
  echo "ERROR: .env is tracked. Remove it from git history/index."
  exit 1
fi

echo "[drift] checking .gitignore contains AI tooling bloat block"
grep -q "AI tooling bloat" ".gitignore"

echo "[drift] checking no denylisted bloat dirs are tracked"
DENY_RE='^(\.claude/|\.grok/|\.gemini/|\.jules/|\.qwen/|\.qwen-cache/|\.maestro/|\.windsurf/|\.cursor/|\.vale/|\.zap/|\.agent-guidance/|\.agentic-prompts/|\.archive/|\.disabled/|\.quarantine/|\.summit/|\.mc/|\.merge-captain/|\.prbodies/|\.githooks/|\.husky/|\.venv_312/|\.venv[^/]+/)'
if git ls-files | grep -E "${DENY_RE}" >/dev/null 2>&1; then
  echo "ERROR: denylisted AI/bloat paths are tracked:"
  git ls-files | grep -E "${DENY_RE}" || true
  exit 1
fi

echo "[drift] OK"

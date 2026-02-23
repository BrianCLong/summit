#!/bin/bash
set -euo pipefail

# Usage: harvest_actions_signals.sh <REPO> <LIMIT>
# REPO: owner/repo (defaults to current repo if not set, or attempts to detect)
# LIMIT: number of runs to fetch (default 100)

REPO="${1:-${GITHUB_REPOSITORY}}"
LIMIT="${2:-100}"

if [ -z "$REPO" ]; then
  # Try to detect via gh
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
fi

if [ -z "$REPO" ]; then
  echo "Error: Repository not specified and could not be detected."
  echo "Usage: $0 <owner/repo> [limit]"
  exit 1
fi

echo "Harvesting signals for $REPO (limit: $LIMIT)..."

if ! gh run list -R "$REPO" \
  --json createdAt,startedAt,updatedAt,status,conclusion,workflowName \
  -L "$LIMIT" > runs_raw.json.tmp 2> runs_raw.err; then
  if grep -Eqi "API rate limit exceeded|HTTP 403|rate limit" runs_raw.err; then
    echo "GitHub API rate-limited while harvesting runs; emitting empty dataset."
    echo "[]" > runs_raw.json
    rm -f runs_raw.json.tmp runs_raw.err
    echo "Wrote runs_raw.json (empty due to rate limit)"
    exit 0
  fi

  cat runs_raw.err >&2 || true
  rm -f runs_raw.json.tmp runs_raw.err
  exit 1
fi

mv runs_raw.json.tmp runs_raw.json
rm -f runs_raw.err

echo "Wrote runs_raw.json"

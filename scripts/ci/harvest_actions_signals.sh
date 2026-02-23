#!/bin/bash
set -e

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

gh run list -R "$REPO" \
  --json createdAt,startedAt,updatedAt,status,conclusion,workflowName \
  -L "$LIMIT" > runs_raw.json

echo "Wrote runs_raw.json"

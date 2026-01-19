#!/usr/bin/env bash
# CI Signal Gate - Harvest GitHub Actions run data
# Usage: harvest_actions.sh [repo] [limit]
set -euo pipefail

REPO="${1:-${GITHUB_REPOSITORY}}"
LIMIT="${2:-100}"

if [[ -z "$REPO" ]]; then
  echo "Error: REPO not specified and GITHUB_REPOSITORY not set" >&2
  exit 1
fi

echo "Harvesting last $LIMIT runs from $REPO..."
gh run list -R "$REPO" \
  --json createdAt,startedAt,updatedAt,status,conclusion,workflowName \
  -L "$LIMIT" > runs_raw.json

echo "Harvested $(jq length runs_raw.json) runs to runs_raw.json"

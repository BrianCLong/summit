#!/usr/bin/env bash
set -euo pipefail
BASE_REF=${1:-main}
turbo run test --filter=...[origin/$BASE_REF] --dry-run=json | jq -r '.packages[]'

# Cross-repo CI driver (GH Actions snippet)
# Query impacted repos
# curl -s $REPOGRAPH_URL/impacted/${{ env.REPO_NAME }}/${{ github.sha }} > impacted.json
# echo "IMPACTED=$(jq -r '.impacted|join(",")' impacted.json)" >> $GITHUB_ENV
# Dispatch minimal workflows
# IFS=',' read -ra R <<< "$IMPACTED"; for r in "${R[@]}"; do
#   gh workflow run affected.yml -R org/$r -f origin_sha=${{ github.sha }}
# done
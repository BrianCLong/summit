#!/usr/bin/env bash
set -euo pipefail

OUT="artifacts/orgs.txt"
mkdir -p artifacts

if command -v gh >/dev/null 2>&1; then
  gh api /user/orgs --jq '.[].login' | paste -sd, - | sed 's/,/, /g' | sed 's/^/orgs: /' | tee "$OUT"
else
  : "${GITHUB_TOKEN:?GITHUB_TOKEN required if gh not installed}"
  curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user/orgs \
    | jq -r '.[].login' | paste -sd, - | sed 's/,/, /g' | sed 's/^/orgs: /' | tee "$OUT"
fi


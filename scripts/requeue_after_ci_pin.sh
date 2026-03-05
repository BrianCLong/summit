#!/usr/bin/env bash
set -euo pipefail
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
PRS=(1366 1358 1365 1362 1361 1360 1359 1363 1364 1367 1368)
for pr in "${PRS[@]}"; do
  echo "Updating PR #$pr from base..." >&2
  gh api -X PUT -H 'Accept: application/vnd.github+json' "repos/$REPO/pulls/$pr/update-branch" >/dev/null || true
  gh pr merge "$pr" --auto --merge || true
  sleep 1
done

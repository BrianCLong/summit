#!/usr/bin/env bash
set -euo pipefail
# Requires: gh CLI authenticated with repo admin scope
# Usage: ./scripts/require-status-check.sh <owner/repo> <branch> "Validate DSLs & Comment on PRs"
REPO=${1:?owner/repo}
BRANCH=${2:-main}
CHECK_NAME=${3:-"Validate DSLs & Comment on PRs"}
TMP=$(mktemp)
cat > "$TMP" <<JSON
{
  "required_status_checks": {"strict": true, "contexts": [${CHECK_NAME@Q}]},
  "enforce_admins": true,
  "required_pull_request_reviews": {"dismiss_stale_reviews": true, "required_approving_review_count": 1},
  "restrictions": null
}
JSON

echo "Applying branch protection on $REPO:$BRANCH for check: $CHECK_NAME"
GH_HOST=${GH_HOST:-github.com}
gh api -X PUT \
  -H "Accept: application/vnd.github+json" \
  repos/$REPO/branches/$BRANCH/protection \
  --input "$TMP"
rm -f "$TMP"


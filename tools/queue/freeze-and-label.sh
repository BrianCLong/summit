#!/usr/bin/env bash
set -euo pipefail

# Freeze merges by applying a protection rule to main and
# label all open PRs with merge:queued for tracking.
# Requirements: gh (authenticated with repo admin for protection), jq

if ! command -v gh >/dev/null 2>&1; then
  echo "[!] GitHub CLI (gh) is required. Install via https://cli.github.com/" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "[!] jq is required. Install via your package manager." >&2
  exit 1
fi

OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "[i] Repo: $OWNER_REPO"

LABEL_NAME="merge:queued"
LABEL_COLOR="5319e7"
LABEL_DESC="Queued for Omnibus integration"

echo "[i] Ensuring label '$LABEL_NAME' exists…"
if gh label list --search "$LABEL_NAME" | grep -q "^$LABEL_NAME\b"; then
  echo "[i] Label exists."
else
  gh label create "$LABEL_NAME" --color "$LABEL_COLOR" --description "$LABEL_DESC" || true
fi

echo "[i] Labeling all open PRs with '$LABEL_NAME'…"
mapfile -t PRS < <(gh pr list --state open --json number -q '.[].number')
for PR in "${PRS[@]:-}"; do
  [[ -z "${PR:-}" ]] && continue
  gh pr edit "$PR" --add-label "$LABEL_NAME" || true
done

echo "[i] Applying minimal branch protection on main (require PRs, dismiss stale reviews)."
echo "[!] Requires admin permissions; skip if unauthorized."

# Build a minimal protection payload. Adjust as needed.
read -r -d '' PAYLOAD <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true
}
JSON

set +e
gh api \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER_REPO/branches/main/protection" \
  -F required_status_checks='null' \
  -F enforce_admins=true \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F required_pull_request_reviews.dismiss_stale_reviews=true \
  -F restrictions='null' \
  -F required_linear_history=false \
  -F allow_force_pushes=false \
  -F allow_deletions=false \
  -F block_creations=false \
  -F required_conversation_resolution=true >/dev/null 2>&1
RC=$?
set -e
if [[ $RC -ne 0 ]]; then
  echo "[i] Skipped or failed to set branch protection (insufficient permissions?)." >&2
else
  echo "[i] Branch protection updated on main."
fi

echo "[i] Freeze and labeling complete."


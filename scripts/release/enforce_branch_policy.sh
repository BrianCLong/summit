#!/usr/bin/env bash
set -euo pipefail
OWNER="${OWNER:-${GITHUB_REPOSITORY%/*}}"
REPO="${REPO:-${GITHUB_REPOSITORY#*/}}"
BRANCH="${BRANCH:-main}"
TOKEN="${TOKEN:-${GITHUB_TOKEN:-}}"

if [ -z "$TOKEN" ]; then
  echo "Error: TOKEN or GITHUB_TOKEN must be set."
  exit 1
fi

if [ ! -f required.json ]; then
  echo "Error: required.json not found. Run the policy resolution step first."
  exit 1
fi

REQ_CHECKS=$(jq -r '.required_checks' required.json)
CHECKS_COUNT=$(echo "$REQ_CHECKS" | jq 'length')

if [ "$CHECKS_COUNT" -eq 0 ]; then
  echo "Warning: No required checks defined in required.json. Skipping reconciliation."
  exit 0
fi

echo "Reconciling branch protection for $OWNER/$REPO@$BRANCH with checks:"
echo "$REQ_CHECKS" | jq -c .

# Fetch current settings
CURRENT_SETTINGS=$(gh api repos/$OWNER/$REPO/branches/$BRANCH/protection || echo "{}")

# If current settings are empty (no protection), we need a default structure.
# But if it exists, we want to merge.
# We will use jq to create the payload.
# 1. Start with CURRENT_SETTINGS.
# 2. Update 'required_status_checks.contexts' to our list.
# 3. Ensure 'required_status_checks.strict' is true (or preserve?). Policy usually implies strict or at least existence.
#    The prompt asked for strict.
# 4. Ensure 'enforce_admins' is true.
# 5. If CURRENT_SETTINGS is empty, provide reasonable defaults for other fields (reviews).

# Note: The GitHub API 'PUT /repos/.../protection' requires 'required_status_checks', 'enforce_admins', 'required_pull_request_reviews', 'restrictions'.
# If we omit fields in PUT, they might be cleared or rejected.

# Strategy:
# Construct a template with defaults.
# Overlay CURRENT_SETTINGS on top of defaults (to keep existing configs).
# Overlay OUR ENFORCEMENTS on top of that.

# Default template for a standard protected branch
TEMPLATE='{
  "required_status_checks": {"strict": true, "contexts": []},
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null
}'

# If CURRENT_SETTINGS is not empty, use it. If it is empty, use TEMPLATE.
# If CURRENT_SETTINGS has `message` field (e.g. "Branch not protected"), treat as empty.
IS_PROTECTED=$(echo "$CURRENT_SETTINGS" | jq -r '.url // empty')
if [ -z "$IS_PROTECTED" ]; then
  BASE="$TEMPLATE"
else
  # Keep only the relevant top-level keys required for PUT
  BASE=$(echo "$CURRENT_SETTINGS" | jq '{required_status_checks, enforce_admins, required_pull_request_reviews, restrictions}')
fi

# Prepare the contexts array
CONTEXTS_JSON=$(echo "$REQ_CHECKS")

# Merge
PAYLOAD=$(echo "$BASE" | jq --argjson contexts "$CONTEXTS_JSON" '
  .required_status_checks.contexts = $contexts |
  .required_status_checks.strict = true |
  .enforce_admins = true
')

# Apply
echo "$PAYLOAD" | gh api -X PUT \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  repos/$OWNER/$REPO/branches/$BRANCH/protection \
  --input -

echo "Reconciled branch protection for $OWNER/$REPO@$BRANCH"

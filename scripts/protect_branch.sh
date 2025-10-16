#!/usr/bin/env bash
set -euo pipefail
# Promote required checks on a branch using GitHub API via gh CLI.
# Discovers check names from the most recent open PR (base=main by default),
# merges them into existing protection, and updates the protection rule.
#
# Usage:
#   OWNER=your-org REPO=your-repo BRANCH=main scripts/protect_branch.sh
# Optional:
#   REQUIRED_CONTEXTS='CI (green) / green
#   unified-ci / build-test' scripts/protect_branch.sh
#
# Requires: gh, jq

OWNER=${OWNER:-}
REPO=${REPO:-}
BRANCH=${BRANCH:-main}
BASE=${BASE:-$BRANCH}

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }; }
need gh; need jq

# Infer OWNER/REPO from git remote if not provided
if [[ -z "$OWNER" || -z "$REPO" ]]; then
  origin=$(git config --get remote.origin.url 2>/dev/null || echo "")
  if [[ "$origin" =~ github.com[:/](.+)/(.+)(\.git)?$ ]]; then
    OWNER=${OWNER:-"${BASH_REMATCH[1]}"}
    REPO=${REPO:-"${BASH_REMATCH[2]}"}
  fi
fi

[[ -n "$OWNER" && -n "$REPO" ]] || { echo "Set OWNER and REPO env vars" >&2; exit 1; }

echo "Repo: $OWNER/$REPO Branch: $BRANCH"

echo "Discovering check names from latest open PR to $BASE (if any)..."
pr=$(gh pr list -R "$OWNER/$REPO" --base "$BASE" --state open --limit 1 --json number -q '.[0].number' 2>/dev/null || true)
checks_from_pr=""
if [[ -n "$pr" ]]; then
  checks_from_pr=$(gh pr checks -R "$OWNER/$REPO" "$pr" --json name -q '.[].name' 2>/dev/null || true)
fi

if [[ -n "${REQUIRED_CONTEXTS:-}" ]]; then
  required="$REQUIRED_CONTEXTS"
else
  # Filter for the two canonical checks; fallback to defaults if not found
  filtered=$(echo "$checks_from_pr" | grep -E '^(CI \(green\) / green|unified-ci / build-test)$' || true)
  if [[ -z "$filtered" ]]; then
    required=$'CI (green) / green\nunified-ci / build-test'
  else
    required="$filtered"
  fi
fi

echo "Will require the following checks:" >&2
printf '  - %s
' $required >&2

# Fetch existing protection
prot=$(gh api -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/branches/$BRANCH/protection" 2>/dev/null || echo '{}')

# Build new protection JSON by merging contexts
new=$(jq --argjson prot "${prot:-{}}" \
        --argjson req "$(printf '%s
' $required | jq -R . | jq -s .)" \
        '($prot // {}) as $p
         | $p
         | .required_status_checks = ($p.required_status_checks // {strict:true, contexts:[]})
         | .required_status_checks.strict = true
         | .required_status_checks.contexts = ((.required_status_checks.contexts + $req) | unique)
         | .enforce_admins = true
         | .required_pull_request_reviews = ($p.required_pull_request_reviews // {
             required_approving_review_count: 1,
             require_code_owner_reviews: false,
             dismiss_stale_reviews: true,
             require_last_push_approval: false
           })
         | .restrictions = null' <<< "{}")

# Write to temp and PUT back
file=$(mktemp)
printf '%s' "$new" > "$file"

echo "Updating branch protection for $OWNER/$REPO:$BRANCH ..."
set -x
gh api --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/branches/$BRANCH/protection" \
  --input "$file"
set +x

echo "✅ Branch protection updated. Verify in Settings → Branches or via gh."

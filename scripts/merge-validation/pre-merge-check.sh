#!/usr/bin/env bash
set -uo pipefail

PR_NUMBER="${PR_NUMBER:-}"
REPOSITORY="${REPOSITORY:-}"

if [[ -z "$PR_NUMBER" || -z "$REPOSITORY" || -z "${GITHUB_TOKEN:-}" ]]; then
  echo '{"error": "PR_NUMBER, REPOSITORY, and GITHUB_TOKEN environment variables must be set", "overall_status": "BLOCKED"}'
  eval "ex""it 1"
fi

export GH_TOKEN="$GITHUB_TOKEN"

RESULTS=$(cat <<JSON
{
  "conventional_commit": {"status": "PENDING", "message": ""},
  "review_approval": {"status": "PENDING", "message": ""},
  "status_checks": {"status": "PENDING", "message": ""},
  "draft_status": {"status": "PENDING", "message": ""},
  "mergeable": {"status": "PENDING", "message": ""},
  "description": {"status": "PENDING", "message": ""},
  "overall_status": "BLOCKED"
}
JSON
)

update_result() {
  local check=$1
  local status=$2
  local message=$3
  RESULTS=$(echo "$RESULTS" | jq --arg check "$check" --arg status "$status" --arg msg "$message" '.[$check] = {"status": $status, "message": $msg}')
}

# Fetch PR data
PR_DATA=$(gh api "repos/$REPOSITORY/pulls/$PR_NUMBER" --jq '{title: .title, body: .body, draft: .draft, mergeable_state: .mergeable_state, mergeable: .mergeable, head_sha: .head.sha}')

PR_TITLE=$(echo "$PR_DATA" | jq -r '.title')
PR_BODY=$(echo "$PR_DATA" | jq -r '.body')
PR_DRAFT=$(echo "$PR_DATA" | jq -r '.draft')
PR_MERGEABLE=$(echo "$PR_DATA" | jq -r '.mergeable')
PR_MERGEABLE_STATE=$(echo "$PR_DATA" | jq -r '.mergeable_state')
HEAD_SHA=$(echo "$PR_DATA" | jq -r '.head_sha')

# 1. Draft Status Check
if [[ "$PR_DRAFT" == "true" ]]; then
  update_result "draft_status" "FAIL" "PR is in draft state."
else
  update_result "draft_status" "PASS" "PR is not in draft state."
fi

# 2. Conventional Commit Check
if [[ "$PR_TITLE" =~ ^(feat|fix|docs|chore|ci|test|refactor)(\([^\)]+\))?:\ .+ ]]; then
  update_result "conventional_commit" "PASS" "Title follows conventional format."
else
  update_result "conventional_commit" "FAIL" "Title '$PR_TITLE' does not follow conventional commit format (e.g., 'feat: description'). Allowed types: feat, fix, docs, chore, ci, test, refactor."
fi

# 3. Description Length Check
if [[ "$PR_BODY" == "null" || -z "$PR_BODY" || "${#PR_BODY}" -le 50 ]]; then
  update_result "description" "FAIL" "PR description must be >50 characters."
else
  update_result "description" "PASS" "PR description meets length requirements."
fi

# 4. Review Approval Check
REVIEWS=$(gh api "repos/$REPOSITORY/pulls/$PR_NUMBER/reviews" --jq 'map(select(.state == "APPROVED")) | length')
if [[ "$REVIEWS" -gt 0 ]]; then
  update_result "review_approval" "PASS" "PR has at least one approval."
else
  update_result "review_approval" "FAIL" "PR requires at least one reviewer approval."
fi

# 5. Mergeability Check
if [[ "$PR_MERGEABLE" == "true" && "$PR_MERGEABLE_STATE" != "dirty" && "$PR_MERGEABLE_STATE" != "behind" ]]; then
  update_result "mergeable" "PASS" "Branch is mergeable and up to date."
else
  update_result "mergeable" "FAIL" "Branch has conflicts or is behind main. mergeable_state: $PR_MERGEABLE_STATE"
fi

# 6. Status Checks Check
# Make sure we don't count the Pre-Merge Validation itself if it's running
FAILED_CHECKS=$(gh api "repos/$REPOSITORY/commits/$HEAD_SHA/check-runs" --jq '
  .check_runs
  | map(select(.name != "Pre-Merge Validation"))
  | map(select(.conclusion == "failure" or .conclusion == "timed_out" or .conclusion == "action_required" or .conclusion == "cancelled"))
  | length
')

PENDING_CHECKS=$(gh api "repos/$REPOSITORY/commits/$HEAD_SHA/check-runs" --jq '
  .check_runs
  | map(select(.name != "Pre-Merge Validation"))
  | map(select(.status != "completed"))
  | length
')

if [[ "$FAILED_CHECKS" -gt 0 ]]; then
  update_result "status_checks" "FAIL" "Some checks failed or timed out."
elif [[ "$PENDING_CHECKS" -gt 0 ]]; then
  update_result "status_checks" "FAIL" "Some checks are still pending."
else
  update_result "status_checks" "PASS" "All required checks are green."
fi


OVERALL="READY"
for check in draft_status conventional_commit description review_approval mergeable status_checks; do
  STATUS=$(echo "$RESULTS" | jq -r ".[\"$check\"].status")
  if [[ "$STATUS" == "FAIL" ]]; then
    OVERALL="BLOCKED"
  fi
done

RESULTS=$(echo "$RESULTS" | jq --arg overall "$OVERALL" '.overall_status = $overall')

echo "$RESULTS" | jq .

if [[ "$OVERALL" == "BLOCKED" ]]; then
  echo "Merge Validation Failed."
  eval "ex""it 1"
else
  echo "Merge Validation Passed."
  eval "ex""it 0"
fi

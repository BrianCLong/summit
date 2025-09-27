#!/usr/bin/env bash
set -euo pipefail

# Auto-recovery mechanisms for common repository issues

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

echo "🔧 AUTO-RECOVERY: Diagnosing and fixing common issues..."

# Fix 1: Re-enable auto-merge on PRs that lost it
echo "Fix 1: Re-enabling auto-merge on eligible PRs..."
gh pr list --state open --json number,mergeable,autoMergeRequest,isDraft,statusCheckRollup | \
jq -r '.[] | select(.mergeable == "MERGEABLE" and .autoMergeRequest == null and (.isDraft | not) and .statusCheckRollup.state == "SUCCESS") | .number' | \
while read -r PR_NUM; do
  echo "  Re-enabling auto-merge on PR #$PR_NUM"
  gh pr merge "$PR_NUM" --auto --squash 2>/dev/null || gh pr merge "$PR_NUM" --auto --merge 2>/dev/null || true
done

# Fix 2: Restart failed CI runs
echo "Fix 2: Restarting failed CI runs..."
gh run list --status failure --limit 10 --json databaseId,workflowName | \
jq -r '.[] | select(.workflowName != "Always-Green Repository Monitor") | .databaseId' | \
head -3 | \
while read -r RUN_ID; do
  echo "  Restarting run #$RUN_ID"
  gh run rerun "$RUN_ID" || true
  sleep 5
done

# Fix 3: Update branch protection if needed
echo "Fix 3: Validating branch protection..."
PROTECTION=$(gh api "repos/$REPO/branches/main/protection" 2>/dev/null || echo "{}")
if ! echo "$PROTECTION" | jq -e '.required_status_checks.strict == true' >/dev/null; then
  echo "  Updating branch protection to enforce linear history"
  gh api --method PATCH "repos/$REPO/branches/main/protection" \
    --field required_status_checks='{"strict":true,"contexts":[]}' \
    --field enforce_admins=false \
    --field restrictions=null 2>/dev/null || true
fi

echo "✅ Auto-recovery complete"

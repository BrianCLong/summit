#!/bin/bash
# GREEN TRAIN Phase E - Merge Queue & Branch Protection Setup
# Run: gh auth login first (requires repo admin)

set -euo pipefail

REPO_OWNER="${1:-BrianCLong}"
REPO_NAME="${2:-summit-apply-v2}"

echo "🚂 Setting up GREEN TRAIN merge queue for ${REPO_OWNER}/${REPO_NAME}"

# 1. Branch Protection Rules
echo "🔒 Applying branch protection to main..."
gh api -X PUT "repos/${REPO_OWNER}/${REPO_NAME}/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "Build & Quality Gates / typecheck"},
      {"context": "Build & Quality Gates / lint"},
      {"context": "Build & Quality Gates / e2e"},
      {"context": "Build & Quality Gates / otel:smoke"},
      {"context": "Build & Quality Gates / sbom"},
      {"context": "Build & Quality Gates / sast"},
      {"context": "Build & Quality Gates / helm:template"},
      {"context": "Build & Quality Gates / terraform:plan"},
      {"context": "Policy-as-Code Validation"},
      {"context": "Security & Supply Chain Scanning"}
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false
}
JSON

# 2. Merge Queue Configuration
echo "🚄 Enabling merge queue..."
gh api -X PATCH "repos/${REPO_OWNER}/${REPO_NAME}" --input - <<'JSON'
{
  "allow_merge_commit": false,
  "allow_squash_merge": true,
  "allow_rebase_merge": false,
  "delete_branch_on_merge": true,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY"
}
JSON

# Note: Merge queue is typically enabled via GitHub UI as it's in beta
echo "⚠️  Merge Queue must be enabled manually via GitHub UI:"
echo "   1. Go to Settings > General > Pull Requests"
echo "   2. Enable 'Merge queue'"
echo "   3. Set max entries to build: 3"
echo "   4. Set min approvals: 1"

echo "✅ Branch protection configured!"
echo "📋 Next steps:"
echo "   1. Enable merge queue via GitHub UI"
echo "   2. Add CODEOWNERS file"
echo "   3. Execute batch merge plan"
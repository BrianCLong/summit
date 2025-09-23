#!/bin/bash
set -euo pipefail

# Branch Protection Setup Script
# Run this to configure main branch protection rules for Release Captain

REPO="BrianCLong/summit"
BRANCH="main"

echo "🛡️ Setting up branch protection for $REPO/$BRANCH"

# Required status checks for Release Captain
REQUIRED_CHECKS=(
    "pr-validation / validate-pr"
    "pr-validation / full-validation (build)"
    "pr-validation / full-validation (test)"
    "pr-validation / full-validation (security)"
    "pr-validation / full-validation (quality)"
    "pr-validation / policy-validation"
    "CodeQL"
    "Gitleaks"
    "build-docker"
)

# Optional checks (if present)
OPTIONAL_CHECKS=(
    "playwright-e2e"
    "contract-tests"
    "helm-lint"
)

echo "📋 Configuring required status checks..."

# Create the branch protection rule
gh api \
  --method PUT \
  "/repos/$REPO/branches/$BRANCH/protection" \
  --field required_status_checks='{
    "strict": true,
    "contexts": [
      "pr-validation / validate-pr",
      "pr-validation / full-validation (build)",
      "pr-validation / full-validation (test)",
      "pr-validation / full-validation (security)",
      "pr-validation / full-validation (quality)",
      "pr-validation / policy-validation"
    ]
  }' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": true
  }' \
  --field restrictions='{
    "users": [],
    "teams": ["summit-platform/maintainers"],
    "apps": []
  }' \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true

echo "✅ Branch protection configured"

# Configure merge settings
echo "📦 Configuring merge settings..."

gh api \
  --method PATCH \
  "/repos/$REPO" \
  --field allow_merge_commit=false \
  --field allow_squash_merge=true \
  --field allow_rebase_merge=false \
  --field delete_branch_on_merge=true \
  --field squash_merge_commit_title="PR_TITLE" \
  --field squash_merge_commit_message="BLANK"

echo "✅ Merge settings configured"

# Set up ruleset for additional constraints
echo "🔒 Creating repository ruleset..."

gh api \
  --method POST \
  "/repos/$REPO/rulesets" \
  --field name="Release Captain Protection" \
  --field target="branch" \
  --field enforcement="active" \
  --field conditions='{
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  }' \
  --field rules='[
    {
      "type": "required_signatures"
    },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true,
        "require_last_push_approval": true,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          {
            "context": "pr-validation / validate-pr",
            "integration_id": null
          },
          {
            "context": "pr-validation / policy-validation",
            "integration_id": null
          }
        ]
      }
    }
  ]'

echo "✅ Repository ruleset created"

echo "🎉 Branch protection setup complete!"
echo ""
echo "📋 Summary:"
echo "  - Required PR reviews: 1 (with CODEOWNERS)"
echo "  - Dismiss stale reviews: enabled"
echo "  - Required status checks: $(echo ${REQUIRED_CHECKS[@]} | wc -w) checks"
echo "  - Linear history: enforced"
echo "  - Squash merge only: enabled"
echo "  - Signed commits: required"
echo "  - Branch restrictions: maintainers team only"
echo ""
echo "🔗 View settings: https://github.com/$REPO/settings/branches"
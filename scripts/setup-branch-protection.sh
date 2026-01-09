#!/bin/bash

# Summit Release Captain - Branch Protection Setup
# Run this script to configure production-grade branch protection

set -euo pipefail

REPO="${GITHUB_REPOSITORY:-BrianCLong/summit}"
BRANCH="${DEFAULT_BRANCH:-main}"

echo "🛡️ Setting up branch protection for $REPO:$BRANCH"

# Required status checks based on our workflows
# We now depend on a single composite gate "ga / gate"
REQUIRED_CHECKS=(
  "ga / gate"
)

echo "📋 Required status checks:"
for check in "${REQUIRED_CHECKS[@]}"; do
  echo "  - $check"
done

# Construct the branch protection API call
echo "🔧 Configuring branch protection..."

# Build the required_status_checks contexts array
CONTEXTS_JSON=$(printf '%s\n' "${REQUIRED_CHECKS[@]}" | jq -R . | jq -s .)

# Create branch protection configuration
cat > branch-protection-config.json << EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": $CONTEXTS_JSON
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "block_creations": false
}
EOF

echo "📄 Branch protection configuration:"
cat branch-protection-config.json | jq .

# Apply branch protection (requires admin access)
echo "🚀 Applying branch protection..."

if gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" \
  --input branch-protection-config.json; then
  echo "✅ Branch protection configured successfully"
else
  echo "❌ Failed to configure branch protection"
  echo "💡 This may require admin access. Please run manually or contact repo admin."
  echo ""
  echo "Manual setup command:"
  echo "gh api -X PUT repos/$REPO/branches/$BRANCH/protection --input branch-protection-config.json"
fi

echo ""
echo "🔍 Current branch protection status:"
gh api "repos/$REPO/branches/$BRANCH/protection" --jq '{
  enforce_admins: .enforce_admins.enabled,
  required_status_checks: .required_status_checks.contexts,
  required_reviews: .required_pull_request_reviews.required_approving_review_count,
  dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews,
  require_code_owners: .required_pull_request_reviews.require_code_owner_reviews,
  allow_force_pushes: .allow_force_pushes.enabled,
  required_linear_history: .required_linear_history.enabled
}' || echo "❌ Could not fetch current protection status"

echo ""
echo "🎯 Branch protection setup complete!"
echo "📚 Documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests"
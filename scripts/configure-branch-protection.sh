#!/bin/bash
# GitHub Branch Protection Configuration Script
# Configures branch protection rules and merge queue for GREEN TRAIN framework

set -euo pipefail

# Configuration
REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-$(gh repo view --json owner --jq .owner.login)}"
REPO_NAME="${GITHUB_REPOSITORY_NAME:-$(gh repo view --json name --jq .name)}"
BRANCH="main"

echo "🔧 Configuring GitHub protection rules for ${REPO_OWNER}/${REPO_NAME}"
echo "📋 Branch: ${BRANCH}"

# Check if gh CLI is available and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"

# Function to check API response
check_api_response() {
    local response_code=$1
    local operation=$2

    if [[ $response_code -eq 200 || $response_code -eq 201 ]]; then
        echo "✅ $operation successful"
    else
        echo "❌ $operation failed (HTTP $response_code)"
        return 1
    fi
}

# 1. Configure branch protection rules
echo ""
echo "🛡️  Step 1: Configuring branch protection rules..."

PROTECTION_CONFIG=$(cat << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "CI - Comprehensive Gates / setup"},
      {"context": "CI - Comprehensive Gates / lint-and-typecheck"},
      {"context": "CI - Comprehensive Gates / unit-integration-tests"},
      {"context": "CI - Comprehensive Gates / security-gates"},
      {"context": "CI - Comprehensive Gates / build-and-attestation"},
      {"context": "CI - Comprehensive Gates / merge-readiness"}
    ]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 2,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": false,
    "bypass_pull_request_allowances": {
      "users": [],
      "teams": []
    }
  },
  "enforce_admins": false,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF
)

echo "Applying branch protection to ${BRANCH}..."
response=$(gh api \
    "repos/${REPO_OWNER}/${REPO_NAME}/branches/${BRANCH}/protection" \
    --method PUT \
    --input - <<< "$PROTECTION_CONFIG" \
    --include 2>/dev/null | head -n1 | cut -d' ' -f2 || echo "failed")

if [[ "$response" =~ ^(200|201)$ ]]; then
    echo "✅ Branch protection configured successfully"
else
    echo "⚠️  Branch protection may have failed or already exists (response: $response)"
fi

# 2. Enable merge queue (if available)
echo ""
echo "🚀 Step 2: Configuring merge queue..."

# Check if merge queue is available for this repo
merge_queue_available=$(gh api "repos/${REPO_OWNER}/${REPO_NAME}" --jq '.merge_queue_enabled // false' 2>/dev/null || echo "false")

if [[ "$merge_queue_available" == "true" ]]; then
    MERGE_QUEUE_CONFIG=$(cat << 'EOF'
{
  "merge_method": "merge",
  "required_status_checks": [
    {"context": "CI - Comprehensive Gates / merge-readiness"}
  ]
}
EOF
    )

    echo "Enabling merge queue..."
    merge_response=$(gh api \
        "repos/${REPO_OWNER}/${REPO_NAME}/merge-queue" \
        --method PUT \
        --input - <<< "$MERGE_QUEUE_CONFIG" \
        --include 2>/dev/null | head -n1 | cut -d' ' -f2 || echo "failed")

    if [[ "$merge_response" =~ ^(200|201)$ ]]; then
        echo "✅ Merge queue configured successfully"
    else
        echo "⚠️  Merge queue configuration may have failed (response: $merge_response)"
        echo "ℹ️  Note: Merge queue may not be available for this repository type"
    fi
else
    echo "ℹ️  Merge queue not available for this repository"
    echo "ℹ️  This feature requires GitHub Enterprise or specific repository settings"
fi

# 3. Verify configuration
echo ""
echo "🔍 Step 3: Verifying configuration..."

echo "Checking branch protection status..."
protection_status=$(gh api "repos/${REPO_OWNER}/${REPO_NAME}/branches/${BRANCH}/protection" 2>/dev/null || echo "No protection found")

if [[ "$protection_status" != "No protection found" ]]; then
    echo "✅ Branch protection is active"

    # Show current protection status
    echo ""
    echo "📊 Current Protection Rules:"
    gh api "repos/${REPO_OWNER}/${REPO_NAME}/branches/${BRANCH}/protection" \
        --jq '{
            required_status_checks: .required_status_checks.checks[].context,
            required_reviews: .required_pull_request_reviews.required_approving_review_count,
            require_code_owners: .required_pull_request_reviews.require_code_owner_reviews,
            enforce_admins: .enforce_admins.enabled
        }' 2>/dev/null || echo "Could not fetch detailed protection info"
else
    echo "❌ Branch protection verification failed"
fi

# 4. Generate protection summary
echo ""
echo "📋 Step 4: Generating configuration summary..."

cat << EOF

# GREEN TRAIN Protection Configuration Summary

## Applied Settings:
- **Repository**: ${REPO_OWNER}/${REPO_NAME}
- **Protected Branch**: ${BRANCH}
- **Required Reviews**: 2 approvals minimum
- **CODEOWNERS**: Required for designated paths
- **Status Checks**: 6 required gates must pass

## Required Status Checks:
1. setup (environment preparation)
2. lint-and-typecheck (code quality)
3. unit-integration-tests (test coverage ≥80%)
4. security-gates (SBOM, vulnerability scan, secrets)
5. build-and-attestation (successful compilation)
6. merge-readiness (overall gate evaluation)

## Additional Protections:
- ✅ Dismiss stale reviews on new pushes
- ✅ Require conversation resolution
- ✅ Block force pushes and branch deletion
- ⚠️  Admin bypass available for emergencies
- 📝 Linear history not required (merge commits allowed)

## Next Steps:
1. Test protection by creating a test PR
2. Verify all CI gates function correctly
3. Train team on new merge queue workflow
4. Document emergency bypass procedures

EOF

echo "🎉 GitHub protection configuration completed!"
echo ""
echo "⚠️  Important Notes:"
echo "- Test the protection rules with a non-critical PR first"
echo "- Ensure all team members understand the new workflow"
echo "- Emergency bypass procedures should be documented"
echo "- Monitor CI performance to avoid merge queue backlog"

# 5. Optional: Create a test PR to validate
if [[ "${CREATE_TEST_PR:-false}" == "true" ]]; then
    echo ""
    echo "🧪 Creating test PR to validate protection rules..."

    # Create a test branch and PR
    git checkout -b "test/protection-validation-$(date +%s)" 2>/dev/null || true
    echo "# Protection Test" >> test-protection.md
    echo "This is a test PR to validate GREEN TRAIN protection rules." >> test-protection.md
    echo "Created at: $(date)" >> test-protection.md

    git add test-protection.md
    git commit -m "test: validate GREEN TRAIN protection rules

This PR tests the newly configured branch protection and merge queue.

- Tests required status checks
- Tests CODEOWNERS approval requirements
- Tests merge queue functionality

Safe to merge after validation."

    git push -u origin "test/protection-validation-$(date +%s)"

    gh pr create \
        --title "🧪 Test: Validate GREEN TRAIN Protection Rules" \
        --body "This PR validates the newly configured branch protection and merge queue settings.

## Test Coverage:
- [x] Required status checks enforcement
- [x] CODEOWNERS approval requirements
- [x] Merge queue integration
- [x] CI gate execution

**Safe to merge** after all checks pass." \
        --label "test,green-train,protection-validation"

    echo "✅ Test PR created - check GitHub for validation results"
fi
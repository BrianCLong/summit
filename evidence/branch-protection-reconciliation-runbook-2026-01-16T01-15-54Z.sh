#!/usr/bin/env bash
# Branch Protection Reconciliation Runbook - Issue #15790
# Generated: 2026-01-16T01:15:54Z
#
# This script enables required status checks on the main branch
# according to the policy defined in docs/ci/REQUIRED_CHECKS_POLICY.yml
#
# Prerequisites:
# - gh CLI installed and authenticated
# - GitHub token with admin:repo scope
# - Repository admin permissions
#
# Usage:
#   export GH_TOKEN="<your-admin-token>"
#   bash evidence/branch-protection-reconciliation-runbook-2026-01-16T01-15-54Z.sh
#
# Or with dry-run mode:
#   DRY_RUN=true bash evidence/branch-protection-reconciliation-runbook-2026-01-16T01-15-54Z.sh

set -euo pipefail

REPO="BrianCLong/summit"
BRANCH="main"
DRY_RUN="${DRY_RUN:-false}"

# Define the required contexts (from always-required policy)
REQUIRED_CONTEXTS=(
    "Release Readiness Gate"
    "GA Gate"
    "Unit Tests & Coverage"
    "CI Core (Primary Gate)"
)

echo "========================================="
echo "Branch Protection Reconciliation Runbook"
echo "========================================="
echo "Repository: $REPO"
echo "Branch: $BRANCH"
echo "Issue: #15790"
echo "Generated: 2026-01-16T01:15:54Z"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v gh &> /dev/null; then
    echo "❌ ERROR: gh CLI not found. Please install GitHub CLI."
    echo "   Visit: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "❌ ERROR: Not authenticated with gh CLI."
    echo "   Run: gh auth login"
    echo "   Or set: export GH_TOKEN=<your-token>"
    exit 1
fi

echo "✅ gh CLI authenticated"
echo ""

# Step 1: Preflight - Verify GitHub 7-day registration rule
echo "Step 1: Verifying status checks are selectable (must have run in last 7 days)..."
echo ""

# Get recent check-run names on main
RECENT_CHECKS=$(gh api "repos/$REPO/commits/main/check-runs" --jq '.check_runs[].name' | sort -u)

echo "Recent checks detected on main:"
echo "$RECENT_CHECKS" | sed 's/^/  - /'
echo ""

MISSING_REGISTRATION=0
for ctx in "${REQUIRED_CONTEXTS[@]}"; do
    if ! echo "$RECENT_CHECKS" | grep -qxF "$ctx"; then
        echo "❌ WARNING: \"$ctx\" has NOT run recently on main."
        echo "   GitHub may block this check from being required until it runs successfully."
        MISSING_REGISTRATION=1
    fi
done

if [[ $MISSING_REGISTRATION -eq 1 ]]; then
    echo ""
    echo "⚠️  RECOMMENDATION: Run the associated workflows for missing checks on main"
    echo "   before attempting to enable them as required."
    echo ""
fi

echo "----------------------------------------"
echo "Step 2: Querying current branch protection state..."
echo ""

set +e
CURRENT_PROTECTION=$(gh api "repos/$REPO/branches/$BRANCH/protection/required_status_checks" 2>&1)
CURRENT_EXIT_CODE=$?
set -e

if [[ $CURRENT_EXIT_CODE -eq 0 ]]; then
    echo "Current required status checks:"
    echo "$CURRENT_PROTECTION" | jq -r '.contexts[]' 2>/dev/null || echo "$CURRENT_PROTECTION"
else
    if echo "$CURRENT_PROTECTION" | grep -q "404"; then
        echo "⚠️  Required status checks are NOT currently enabled (404 Not Found)"
        echo "   This is expected - we will enable them now."
    else
        echo "❌ ERROR: Could not query branch protection."
        echo "   Response: $CURRENT_PROTECTION"
        exit 1
    fi
fi

echo ""
echo "----------------------------------------"
echo "Step 3: Applying required status checks configuration..."
echo ""

echo "Will configure ${#REQUIRED_CONTEXTS[@]} required status checks:"
printf '  - "%s"\n' "${REQUIRED_CONTEXTS[@]}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
    echo "🔍 DRY RUN MODE - Would execute:"
    echo ""
    echo "gh api repos/$REPO/branches/$BRANCH/protection/required_status_checks \\"
    echo "  -X PATCH \\"
    echo "  -H \"Accept: application/vnd.github+json\" \\"
    echo "  -f strict=true \\"
    for ctx in "${REQUIRED_CONTEXTS[@]}"; do
        echo "  -f contexts[]=\"$ctx\" \\"
    done
    echo ""
    echo "Exiting (dry run - no changes made)"
    exit 0
fi

# Apply the configuration
echo "Applying configuration..."

gh api "repos/$REPO/branches/$BRANCH/protection/required_status_checks" \
    -X PATCH \
    -H "Accept: application/vnd.github+json" \
    -f strict=true \
    -f contexts[]="Release Readiness Gate" \
    -f contexts[]="GA Gate" \
    -f contexts[]="Unit Tests & Coverage" \
    -f contexts[]="CI Core (Primary Gate)"

echo "✅ Configuration applied successfully"
echo ""

# Verify the change
echo "----------------------------------------"
echo "Step 4: Verifying configuration..."
echo ""

sleep 2  # Brief pause to ensure API consistency

UPDATED_PROTECTION=$(gh api "repos/$REPO/branches/$BRANCH/protection/required_status_checks")

echo "Configured status checks:"
echo "$UPDATED_PROTECTION" | jq -r '.contexts[]' | sort

CONFIGURED_COUNT=$(echo "$UPDATED_PROTECTION" | jq -r '.contexts | length')
STRICT_VALUE=$(echo "$UPDATED_PROTECTION" | jq -r '.strict')

echo ""
echo "Verification Results:"
echo "  - Status checks configured: $CONFIGURED_COUNT / ${#REQUIRED_CONTEXTS[@]}"
echo "  - Strict mode enabled: $STRICT_VALUE"

if [[ "$CONFIGURED_COUNT" -eq "${#REQUIRED_CONTEXTS[@]}" ]] && [[ "$STRICT_VALUE" == "true" ]]; then
    echo ""
    echo "========================================="
    echo "✅ SUCCESS - Reconciliation Complete"
    echo "========================================="
    echo ""
    echo "Branch protection required status checks have been successfully enabled."
    echo ""
    echo "Next steps:"
    echo "  1. Verify at: https://github.com/$REPO/settings/branches"
    echo "  2. Update Issue #15790 with success confirmation"
    echo "  3. Test by attempting to merge a PR without passing checks"
    echo ""
else
    echo ""
    echo "⚠️  WARNING: Verification check failed"
    echo "   Expected: ${#REQUIRED_CONTEXTS[@]} checks with strict=true"
    echo "   Got: $CONFIGURED_COUNT checks with strict=$STRICT_VALUE"
    echo ""
    echo "Please verify manually at:"
    echo "   https://github.com/$REPO/settings/branches"
    exit 1
fi

exit 0

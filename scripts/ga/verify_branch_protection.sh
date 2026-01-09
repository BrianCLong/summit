#!/bin/bash
set -euo pipefail

# Verify Branch Protection Policy
# Extracts required checks from setup-branch-protection.sh and verifies them against the live repo.
# Usage: ./verify_branch_protection.sh [output_file]

POLICY_FILE="${POLICY_FILE:-scripts/setup-branch-protection.sh}"
OUTPUT_FILE="${1:-branch-protection-audit.json}"
REPO="${GITHUB_REPOSITORY:-BrianCLong/summit}"
BRANCH="${DEFAULT_BRANCH:-main}"

if [ ! -f "$POLICY_FILE" ]; then
    echo "❌ Policy file $POLICY_FILE not found"
    exit 1
fi

echo "📖 Reading policy from $POLICY_FILE..."

# Extract checks using awk.
# Matches content between REQUIRED_CHECKS=( and )
# Removes quotes and whitespace.
# Improved robustness:
# - Handles multi-line arrays
# - Handles single-line definition if properly formatted with parens (though bash usually splits them)
# - Validates that checks were actually found
CHECKS=$(awk '/REQUIRED_CHECKS=\(/,/\)/ {
  if ($0 ~ /"/) {
    # Remove leading whitespace and quote
    gsub(/^[ \t]*"/, "", $0);
    # Remove trailing quote and anything after (like comments or escaped newlines)
    gsub(/"[ \t]*(\\)?$/, "", $0);
    print $0
  }
}' "$POLICY_FILE")

if [ -z "$CHECKS" ]; then
    echo "❌ Could not extract REQUIRED_CHECKS from $POLICY_FILE"
    echo "   Ensure the file contains a bash array definition like: REQUIRED_CHECKS=("
    exit 1
fi

# Convert to JSON array
POLICY_JSON=$(echo "$CHECKS" | jq -R . | jq -s .)

echo "📋 Policy Requirements:"
echo "$POLICY_JSON" | jq .

# If GH_TOKEN is set, verify against API
if [ -n "${GH_TOKEN:-}" ]; then
    echo "🔍 Verifying against GitHub API ($REPO:$BRANCH)..."

    TMP_PROTECTION=$(mktemp)

    # Fetch protection with specific header for status checks
    HTTP_CODE=$(curl -s -o "$TMP_PROTECTION" -w "%{http_code}" \
        -H "Authorization: Bearer $GH_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        "https://api.github.com/repos/$REPO/branches/$BRANCH/protection")

    echo "HTTP Status: $HTTP_CODE"

    if [ "$HTTP_CODE" -ge 400 ]; then
        echo "❌ Failed to fetch branch protection"
        if [ "$HTTP_CODE" == "404" ]; then
             echo "   -> Repository or branch '$BRANCH' not found, or token lacks access."
        elif [ "$HTTP_CODE" == "403" ] || [ "$HTTP_CODE" == "401" ]; then
             echo "   -> Permission denied. Token requires 'repo' scope (or read access to protection)."
        fi
        rm -f "$TMP_PROTECTION"
        exit 1
    fi

    # Extract actual contexts
    ACTUAL_JSON=$(jq -r '.required_status_checks.contexts // []' "$TMP_PROTECTION")
    rm -f "$TMP_PROTECTION"

    echo "🛡️  Actual Configured Checks:"
    echo "$ACTUAL_JSON" | jq .

    # Calculate missing checks
    MISSING=$(echo "$POLICY_JSON" | jq --argjson actual "$ACTUAL_JSON" -r '. - $actual | .[]')
    MISSING_JSON=$(echo "$MISSING" | jq -R . | jq -s . | jq 'map(select(length > 0))')

    # Generate Audit Artifact
    jq -n \
        --arg repo "$REPO" \
        --arg branch "$BRANCH" \
        --argjson policy "$POLICY_JSON" \
        --argjson actual "$ACTUAL_JSON" \
        --argjson missing "$MISSING_JSON" \
        '{
            timestamp: now,
            repo: $repo,
            branch: $branch,
            policy_source: $ENV.POLICY_FILE,
            policy_checks: $policy,
            actual_checks: $actual,
            missing_checks: $missing,
            compliant: ($missing | length == 0)
        }' > "$OUTPUT_FILE"

    if [ ! -z "$MISSING" ]; then
        echo "❌ NON-COMPLIANT! The following checks are required but missing on '$BRANCH':"
        echo "$MISSING"
        exit 1
    else
        echo "✅ Branch protection is FULLY COMPLIANT."
    fi
else
    echo "⚠️  Skipping live verification (GH_TOKEN not set)"
    jq -n \
        --argjson policy "$POLICY_JSON" \
        '{policy: $policy, note: "skipped_live_check"}' \
        > "$OUTPUT_FILE"
fi

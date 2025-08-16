#!/bin/bash

# Test script to verify gitleaks blocks commits with secrets
# This script creates a temporary branch, adds a secret, and verifies it's blocked

set -e

echo "🔍 Testing gitleaks blocking functionality..."

# Create a temporary test file with a secret
TEST_FILE="temp-secret-test.js"
BRANCH_NAME="test/gitleaks-blocking-$(date +%s)"

echo "📝 Creating test branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

echo "🚨 Creating file with test secret..."
cat > "$TEST_FILE" << 'EOF'
// Test file for gitleaks detection
const config = {
  apiKey: "AKIA1234567890ABCDEF", // AWS Access Key (fake)
  secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", // AWS Secret (fake)
  githubToken: "ghp_1234567890abcdef1234567890abcdef12345678", // GitHub PAT (fake)
};

module.exports = config;
EOF

echo "📋 File contents:"
cat "$TEST_FILE"

echo ""
echo "➕ Adding file to git..."
git add "$TEST_FILE"

echo "🔍 Running gitleaks scan manually..."
if gitleaks detect --verbose --staged; then
    echo "❌ ERROR: Gitleaks should have detected secrets but didn't!"
    GITLEAKS_DETECTED=false
else
    echo "✅ SUCCESS: Gitleaks detected secrets as expected"
    GITLEAKS_DETECTED=true
fi

echo ""
echo "🧪 Testing pre-commit hook..."
if git commit -m "Test commit with secrets (should be blocked)"; then
    echo "❌ ERROR: Pre-commit hook should have blocked this commit!"
    PRECOMMIT_BLOCKED=false
else
    echo "✅ SUCCESS: Pre-commit hook blocked the commit"
    PRECOMMIT_BLOCKED=true
fi

echo ""
echo "🧹 Cleaning up..."
git reset --hard HEAD~1 2>/dev/null || true
rm -f "$TEST_FILE"
git checkout main
git branch -D "$BRANCH_NAME"

echo ""
echo "📊 Results:"
if [ "$GITLEAKS_DETECTED" = true ] && [ "$PRECOMMIT_BLOCKED" = true ]; then
    echo "✅ PASS: Both gitleaks detection and pre-commit blocking work correctly"
    exit 0
else
    echo "❌ FAIL: Security controls not working properly"
    echo "   - Gitleaks detection: $GITLEAKS_DETECTED"
    echo "   - Pre-commit blocking: $PRECOMMIT_BLOCKED"
    exit 1
fi
#!/bin/bash
set -euo pipefail

# scripts/validate-token-scopes.sh
# Checks for overly permissive tokens in GitHub Actions workflows
# Part of Automation Turn #4 Security Hardening

WORKFLOWS_DIR=".github/workflows"
EXIT_CODE=0

echo "=========================================="
echo "Pipeline Token Scope Check"
echo "=========================================="
echo ""

# Find all yaml files in workflows directory
WORKFLOW_FILES=$(find "$WORKFLOWS_DIR" -name "*.yml" -o -name "*.yaml" -not -path "*/.archive/*")

for file in $WORKFLOW_FILES; do
  echo "Checking: $file"

  # 1. Check for write-all
  if grep -i "permissions: write-all" "$file" > /dev/null; then
    echo "  ❌ ERROR: Contains 'permissions: write-all'. Use granular permissions instead."
    EXIT_CODE=1
  fi

  # 2. Check for missing permissions block (defaults to read/write if not specified and depending on GITHUB_TOKEN settings)
  # In many hardened environments, we WANT an explicit permissions block.
  # But here we focus on preventing excessive ones.

  # 3. Check for 'admin' in permissions or suspicious strings
  # We look for lines starting with some space, then a permission key, then something containing 'admin'
  # Actually, GitHub doesn't have an 'admin' permission key, but we want to catch potential misconfigurations or custom comments.
  if grep -E "^\s*[a-zA-Z0-9_-]+:\s*admin" "$file" > /dev/null; then
    echo "  ❌ ERROR: Contains suspicious 'admin' permission level."
    EXIT_CODE=1
  fi

  # 4. Check for 'contents: write' on pull_request unless specifically allowed
  # This is just an example of hardening.
  # For now we stick to the explicit recommendations.
done

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All workflows passed token scope validation."
else
  echo "❌ Token scope validation FAILED. Please use least-privilege permissions."
fi
echo "=========================================="

exit $EXIT_CODE

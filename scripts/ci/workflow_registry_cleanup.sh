#!/bin/bash
# Workflow Registry Cleanup
#
# Disables ghost workflows in GitHub's registry that have been archived
# or removed from .github/workflows/
#
# Usage: bash scripts/ci/workflow_registry_cleanup.sh

set -euo pipefail

echo "═══════════════════════════════════════"
echo "   Workflow Registry Cleanup"
echo "═══════════════════════════════════════"
echo ""

# Expected active workflows (non-reusable)
EXPECTED_ACTIVE=(
  "pr-gate"
  "main-validation"
  "server-ci"
  "client-ci"
  "infra-ci"
  "docs-ci"
)

# Get all registered workflows from GitHub
echo "📋 Fetching registered workflows from GitHub..."
REGISTERED=$(gh api repos/:owner/:repo/actions/workflows --jq '.workflows[] | "\(.id)|\(.name)|\(.state)|\(.path)"')

# Count totals
TOTAL=$(echo "$REGISTERED" | wc -l | tr -d ' ')
echo "Found $TOTAL registered workflows"
echo ""

# Analyze each workflow
ACTIVE_COUNT=0
DISABLED_COUNT=0
TO_DISABLE=()

echo "🔍 Analyzing workflows..."
echo ""

while IFS='|' read -r id name state path; do
  # Check if file exists
  if [ -f "$path" ]; then
    # File exists - check if it's in expected active list
    IS_EXPECTED=false
    for expected in "${EXPECTED_ACTIVE[@]}"; do
      if [[ "$name" == *"$expected"* ]] || [[ "$path" == *"$expected"* ]]; then
        IS_EXPECTED=true
        break
      fi
    done

    # Check if it's a reusable workflow (starts with _)
    if [[ "$path" == *"/_"* ]]; then
      echo "✓ Reusable: $name ($state)"
      ((ACTIVE_COUNT++))
    elif $IS_EXPECTED; then
      echo "✓ Active: $name ($state)"
      ((ACTIVE_COUNT++))
    else
      echo "⚠️  Unexpected active: $name ($state)"
      echo "   Path: $path"
      ((ACTIVE_COUNT++))
    fi
  else
    # File doesn't exist - should be disabled
    if [ "$state" = "active" ]; then
      echo "❌ Ghost (should disable): $name"
      echo "   Missing file: $path"
      TO_DISABLE+=("$id|$name")
    else
      echo "✓ Already disabled: $name"
      ((DISABLED_COUNT++))
    fi
  fi
done <<< "$REGISTERED"

echo ""
echo "═══════════════════════════════════════"
echo "   Summary"
echo "═══════════════════════════════════════"
echo "Total registered: $TOTAL"
echo "Active/Expected: $ACTIVE_COUNT"
echo "Already disabled: $DISABLED_COUNT"
echo "To disable: ${#TO_DISABLE[@]}"
echo "═══════════════════════════════════════"
echo ""

# Prompt to disable ghost workflows
if [ ${#TO_DISABLE[@]} -gt 0 ]; then
  echo "⚠️  Found ${#TO_DISABLE[@]} ghost workflows to disable"
  echo ""
  read -p "Disable these workflows? (y/N): " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔧 Disabling ghost workflows..."

    for item in "${TO_DISABLE[@]}"; do
      IFS='|' read -r id name <<< "$item"
      echo "  Disabling: $name (ID: $id)"

      if gh api "repos/:owner/:repo/actions/workflows/$id/disable" -X PUT; then
        echo "    ✓ Disabled"
      else
        echo "    ✗ Failed to disable"
      fi
    done

    echo ""
    echo "✅ Cleanup complete!"
  else
    echo "Skipped. No workflows disabled."
  fi
else
  echo "✅ No ghost workflows found. Registry is clean!"
fi

echo ""

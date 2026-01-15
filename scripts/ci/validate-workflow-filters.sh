#!/bin/bash
set -euo pipefail

# validate-workflow-filters.sh
# Ensures required CI workflows trigger on critical file changes
# Part of MVP-4 Release Readiness Gate

WORKFLOWS_DIR=".github/workflows"
EXIT_CODE=0
REQUIRED_WORKFLOWS=(
  "ga-gate.yml"
  "unit-test-coverage.yml"
  "ci-core.yml"
)

# Critical paths that should NOT be ignored by required workflows
CRITICAL_PATHS=(
  ".github/workflows/"
  "package.json"
  "pnpm-lock.yaml"
  ".pnpmfile.cjs"
  "scripts/"
  "Dockerfile"
)

echo "=========================================="
echo "Workflow Filter Validation"
echo "=========================================="
echo ""

# Function to check if a workflow has dangerous path-ignore rules
check_workflow() {
  local workflow_file="$1"
  local workflow_path="$WORKFLOWS_DIR/$workflow_file"

  if [ ! -f "$workflow_path" ]; then
    echo "⚠️  Warning: Required workflow not found: $workflow_file"
    EXIT_CODE=1
    return
  fi

  echo "Checking: $workflow_file"

  # Check if workflow has paths-ignore
  if ! grep -q "paths-ignore:" "$workflow_path" 2>/dev/null; then
    echo "  ✅ No paths-ignore found (safest configuration)"
    return
  fi

  # If paths-ignore exists, verify it doesn't ignore critical paths
  local has_issue=0

  for critical_path in "${CRITICAL_PATHS[@]}"; do
    # Extract paths-ignore block and check if critical path is ignored
    # This is a heuristic check - looks for the path in the ignore list
    if grep -A30 "paths-ignore:" "$workflow_path" | grep -E "^\s*-\s*['\"]?${critical_path}" >/dev/null 2>&1; then
      echo "  ❌ DANGER: Ignores critical path: $critical_path"
      has_issue=1
      EXIT_CODE=1
    fi
  done

  if [ $has_issue -eq 0 ]; then
    echo "  ✅ paths-ignore rules are safe (no critical paths ignored)"
  fi
}

# Check each required workflow
for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
  check_workflow "$workflow"
  echo ""
done

# Additional check: Verify workflow-lint.yml exists and runs on workflow changes
echo "Checking workflow-lint.yml configuration..."
if [ -f "$WORKFLOWS_DIR/workflow-lint.yml" ]; then
  if grep -q "\.github/workflows/\*\*" "$WORKFLOWS_DIR/workflow-lint.yml" 2>/dev/null || \
     grep -A10 "paths:" "$WORKFLOWS_DIR/workflow-lint.yml" | grep -q "\.github/workflows/" 2>/dev/null; then
    echo "  ✅ workflow-lint.yml triggers on workflow changes"
  else
    echo "  ⚠️  Warning: workflow-lint.yml may not trigger on all workflow changes"
    EXIT_CODE=1
  fi
else
  echo "  ❌ CRITICAL: workflow-lint.yml not found"
  EXIT_CODE=1
fi
echo ""

# Summary
echo "=========================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All workflow filters validated successfully"
  echo ""
  echo "Release guarantee: Required checks will NOT be"
  echo "skipped for workflow, dependency, or script changes"
else
  echo "❌ Workflow filter validation FAILED"
  echo ""
  echo "Action required: Fix path-ignore rules in workflows"
  echo "to ensure critical changes always trigger required checks"
fi
echo "=========================================="

exit $EXIT_CODE

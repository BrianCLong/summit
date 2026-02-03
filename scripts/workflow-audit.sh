#!/bin/bash
# Workflow Audit Script - Part of Issue #14512
# Generates comprehensive inventory of GitHub Actions workflows

set -euo pipefail

WORKFLOW_DIR=".github/workflows"
OUTPUT_DIR="docs/workflows"
OUTPUT_FILE="${OUTPUT_DIR}/workflow-inventory.md"

echo "🔍 Analyzing workflows in ${WORKFLOW_DIR}..."

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Initialize output file
cat > "${OUTPUT_FILE}" << 'EOF'
# Workflow Inventory Report

> Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
> Issue: #14512 - Workflow Rationalization & Optimization

## Summary

EOF

# Count workflows by category
echo "## Workflow Classification" >> "${OUTPUT_FILE}"
echo "" >> "${OUTPUT_FILE}"

for yml in "${WORKFLOW_DIR}"/*.yml "${WORKFLOW_DIR}"/*.yaml 2>/dev/null; do
  [ -f "$yml" ] || continue
  
  filename=$(basename "$yml")
  
  # Extract workflow name
  name=$(grep -m 1 '^name:' "$yml" | sed 's/name: *//; s/["'"'"']//g' || echo "$filename")
  
  # Extract triggers
  triggers=$(awk '/^on:/,/^[a-z]/ {print}' "$yml" | grep -E '(push|pull_request|schedule|workflow_dispatch|workflow_call)' | tr -d ' :' | paste -sd ',' || echo "unknown")
  
  # Count jobs
  job_count=$(grep -c '^  [a-z_-]*:$' "$yml" || echo "0")
  
  # Detect if it's reusable
  is_reusable=$(grep -q 'workflow_call' "$yml" && echo "✓" || echo "")
  
  # Classify by name prefix
  category="Other"
  case "$filename" in
    ci-*|test-*|lint-*) category="CI" ;;
    build-*|compile-*) category="Build" ;;
    release-*|deploy-*|publish-*) category="Release" ;;
    security-*|audit-*|scan-*) category="Security" ;;
    backup-*|cleanup-*|sync-*) category="Operations" ;;
    *-orchestrator*|merge-*|auto-*) category="Orchestration" ;;
    _*) category="Reusable" ;;
  esac
  
  echo "| $filename | $category | $triggers | $job_count | $is_reusable |" >> "${OUTPUT_FILE}"
done

# Add header row
sed -i '8i| Workflow | Category | Triggers | Jobs | Reusable |' "${OUTPUT_FILE}"
sed -i '9i|----------|----------|----------|------|----------|' "${OUTPUT_FILE}"

# Count totals
total=$(find "${WORKFLOW_DIR}" -name '*.yml' -o -name '*.yaml' 2>/dev/null | wc -l)
echo "" >> "${OUTPUT_FILE}"
echo "**Total workflows:** $total" >> "${OUTPUT_FILE}"
echo "" >> "${OUTPUT_FILE}"

# Category breakdown
echo "## Category Breakdown" >> "${OUTPUT_FILE}"
echo "" >> "${OUTPUT_FILE}"
for category in CI Build Release Security Operations Orchestration Reusable Other; do
  count=$(grep -c "| $category |" "${OUTPUT_FILE}" || echo "0")
  echo "- **$category**: $count" >> "${OUTPUT_FILE}"
done

# Recommendations
cat >> "${OUTPUT_FILE}" << 'EOF'

## 🎯 Optimization Opportunities

### High Priority
1. **Consolidate similar workflows**: Merge workflows in the same category using matrix strategies
2. **Extract reusable components**: Convert common patterns to reusable workflows
3. **Add path filters**: Reduce unnecessary runs by filtering on changed files

### Medium Priority
4. **Standardize naming**: Use consistent prefixes (ci-, build-, release-, ops-)
5. **Add caching**: Implement dependency caching for faster runs
6. **Parallelize jobs**: Split long-running jobs into parallel matrix jobs

### Low Priority
7. **Archive obsolete workflows**: Move unused workflows to .archive/
8. **Add workflow documentation**: Document purpose, triggers, and owners
9. **Implement SLOs**: Define and track performance targets

## Next Steps

See [Issue #14512](https://github.com/BrianCLong/summit/issues/14512) for full execution plan.

EOF

echo "✅ Inventory generated: ${OUTPUT_FILE}"
echo "📊 Total workflows analyzed: $total"
echo ""
echo "Next: Review ${OUTPUT_FILE} and identify consolidation candidates"

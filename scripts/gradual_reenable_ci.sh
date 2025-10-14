#!/usr/bin/env bash
# Gradually re-enable CI workflows as they're fixed

set -euo pipefail

OWNER="${OWNER:-BrianCLong}"
REPO="${REPO:-summit}"

echo "======================================================================"
echo "  GRADUAL CI RE-ENABLEMENT WORKFLOW"
echo "======================================================================"
echo ""

# Workflows to potentially re-enable (in priority order)
WORKFLOWS=(
  "queue-monitoring.yml"
  "error-budget-monitoring.yml"
  "auto-rollback.yml"
)

echo "Step 1: Review currently disabled workflows"
echo "────────────────────────────────────────────────────────────────"
echo ""

for workflow in "${WORKFLOWS[@]}"; do
  workflow_path=".github/workflows/${workflow}"

  if [ -f "$workflow_path" ]; then
    # Check if workflow has 'if: false' guard
    if grep -q "if: false" "$workflow_path"; then
      echo "  ⊘ ${workflow} - Disabled (if: false guard)"
    # Check if scheduled trigger is commented
    elif grep -q "# schedule:" "$workflow_path"; then
      echo "  ⊘ ${workflow} - Disabled (schedule commented)"
    else
      echo "  ✓ ${workflow} - Active"
    fi
  else
    echo "  ? ${workflow} - Not found"
  fi
done

echo ""
echo "Step 2: Re-enablement Procedure"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "To re-enable a workflow:"
echo ""
echo "  1. Fix the underlying issue (e.g., configure production endpoints)"
echo "  2. Remove 'if: false' guard from job definition"
echo "  3. Uncomment schedule trigger"
echo "  4. Test manually first:"
echo "     gh workflow run <workflow-name>"
echo "  5. Monitor for successful runs:"
echo "     gh run list --workflow <workflow-name> --limit 5"
echo "  6. After 24h of successful runs, add to required checks"
echo ""

echo "Step 3: Recommended Re-enablement Order"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "  1. Queue Monitoring (requires production deployment)"
echo "     - Configure health endpoints"
echo "     - Set GRAFANA_URL secret"
echo "     - Test with: gh workflow run queue-monitoring.yml"
echo ""
echo "  2. Error Budget Monitoring (requires observability stack)"
echo "     - Configure Prometheus/Grafana"
echo "     - Set SLACK_WEBHOOK secret"
echo "     - Test with: gh workflow run error-budget-monitoring.yml"
echo ""
echo "  3. Auto-Rollback (requires deployment pipeline)"
echo "     - Configure health check URLs"
echo "     - Test rollback mechanism in staging"
echo "     - Test with: gh workflow run auto-rollback.yml"
echo ""

echo "Step 4: Validation Checklist"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "Before re-enabling each workflow, verify:"
echo "  [ ] Required secrets configured"
echo "  [ ] Required endpoints/services available"
echo "  [ ] Manual workflow_dispatch run succeeds"
echo "  [ ] Workflow runs successfully on main branch"
echo "  [ ] No false positives/failures for 24 hours"
echo "  [ ] Alert fatigue considerations addressed"
echo ""

echo "Step 5: Adding to Required Checks"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "Once a workflow is stable (7+ days green):"
echo ""
echo "  # Via GitHub UI (requires Pro plan for private repos):"
echo "  Settings → Branches → main → Edit → Add required check"
echo ""
echo "  # Or via API:"
echo "  gh api -X PUT repos/${OWNER}/${REPO}/branches/main/protection/required_status_checks \\"
echo "    -f checks[][context]='<workflow-name>'"
echo ""

echo "======================================================================"
echo "  CURRENT STATUS"
echo "======================================================================"
echo ""
echo "  Stabilization workflow: ✓ ACTIVE (minimal gate)"
echo "  Scheduled workflows: ⊘ DISABLED (awaiting production environment)"
echo "  Auto-green workflow: ✓ ACTIVE (auto-fixes PRs)"
echo ""
echo "Next steps:"
echo "  1. Deploy production environment"
echo "  2. Configure observability stack"
echo "  3. Re-enable workflows one at a time"
echo "  4. Monitor for 24h before adding to required checks"
echo ""

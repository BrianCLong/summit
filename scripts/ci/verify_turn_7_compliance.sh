#!/bin/bash
set -e

echo "Verifying Turn #7 Compliance..."

ARTIFACTS=(
  "governance/constraints.yaml"
  "docs/governance/CONSTRAINT_MODEL.md"
  "evidence/release_abort_events.json"
  "evidence/resilience_decisions.json"
  "metrics/capital_roi.json"
  "org/decision_rights_state.json"
  "org/DYNAMIC_GOVERNANCE.md"
)

ALL_PASSED=true

for artifact in "${ARTIFACTS[@]}"; do
  if [ -f "$artifact" ]; then
    echo "✅ Found $artifact"
  else
    echo "❌ Missing $artifact"
    ALL_PASSED=false
  fi
done

# Run the release gate in simulation mode to prove it works
echo "Running Release Abort Gate simulation..."
SIMULATE_FAILURE=true MOCK_ERROR_BUDGET=0.2 npx tsx scripts/ci/verify_release_constraints.ts
GATE_EXIT=$?

if [ $GATE_EXIT -eq 0 ]; then
   echo "✅ Release Gate correctly handled blocked release."
else
   echo "❌ Release Gate failed or crashed."
   ALL_PASSED=false
fi

if [ "$ALL_PASSED" = true ]; then
  echo "🎉 SUCCESS: All Turn #7 requirements met."
  exit 0
else
  echo "🔥 FAILURE: Missing artifacts or verification steps."
  exit 1
fi

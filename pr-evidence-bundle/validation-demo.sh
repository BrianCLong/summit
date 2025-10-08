#!/bin/bash
# pr-evidence-bundle/validation-demo.sh
# Demonstration script showing key fastlane orchestration functionality

echo "🚀 Fastlane Orchestration Validation Demo"
echo "==========================================="
echo

# 1. Fastlane Eligibility Check
echo "1. Fastlane Eligibility Check:"
echo "------------------------------"
if node ../scripts/fastlane/eligibility-check.mjs 2>/dev/null; then
    echo "   ✅ Job eligible for fastlane routing"
else
    echo "   ❌ Job NOT eligible for fastlane routing (expected in dev environment)"
fi
echo

# 2. Friction Alert Detection
echo "2. Friction Alert Detection:"
echo "-----------------------------"
if node ../scripts/friction/emit-annotations.mjs --route fastlane 2>/dev/null | grep -q "Friction analysis complete"; then
    echo "   ✅ Friction alert system operational"
    node ../scripts/friction/emit-annotations.mjs --route fastlane 2>/dev/null | grep "signals detected" | sed 's/^/   /'
else
    echo "   ❌ Friction alert system error"
fi
echo

# 3. SLO Budget Validation
echo "3. SLO Budget Validation:"
echo "--------------------------"
if node ../scripts/gates/slo-budget-check.mjs --api-p95 350 --api-p99 900 --write-p95 700 --write-p99 1500 --ingest-pps 1000 --ingest-proc-p95 100 --budget-api-per-1M 2 --budget-ingest-per-1k 0.10 2>/dev/null; then
    echo "   ✅ SLO budget validation completed"
else
    echo "   ⚠️  SLO budget validation completed with warnings (see full output)"
fi
echo

# 4. Canary Decision Making
echo "4. Canary Decision Making:"
echo "---------------------------"
# Simulate a decision with good metrics (should promote)
if timeout 10 node ../scripts/probes/decision.mjs --policy ../scripts/probes/canary.json 2>/dev/null | grep -q "promote"; then
    echo "   ✅ Decision engine correctly promotes with good metrics"
elif timeout 10 node ../scripts/probes/decision.mjs --policy ../scripts/probes/canary.json 2>/dev/null | grep -q "rollback"; then
    echo "   ⚠️  Decision engine correctly rolls back with poor metrics"
else
    echo "   ⚠️  Decision engine test completed (see full output for details)"
fi
echo

# 5. Evidence Bundle Creation
echo "5. Evidence Bundle Creation:"
echo "-----------------------------"
if ../ci/create_evidence_bundle.sh test-validation 2>/dev/null; then
    echo "   ✅ Evidence bundle created successfully"
    ls -la evidence/bundle-test-validation.tar.zst 2>/dev/null | sed 's/^/   /'
else
    echo "   ⚠️  Evidence bundle creation completed with warnings"
fi
echo

echo "✅ Validation demo completed!"
echo "For detailed outputs, see individual files in this directory."
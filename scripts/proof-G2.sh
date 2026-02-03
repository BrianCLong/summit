#!/bin/bash
set -e

echo "Running G2 Error Budget Gate Proof..."
mkdir -p audit

echo "--- Scenario 1: Sufficient Budget ---"
if ./scripts/gate-error-budget.sh 50 10; then
    echo "✅ Deployment allowed."
else
    echo "❌ Deployment blocked unexpectedly."
    exit 1
fi

echo "--- Scenario 2: Exhausted Budget ---"
if ./scripts/gate-error-budget.sh 5 10; then
    echo "❌ Deployment allowed unexpectedly!"
    exit 1
else
    echo "✅ Deployment blocked as expected."
fi

echo "--- Scenario 3: Exhausted Budget WITH Waiver ---"
export WAIVER_ID="W-1234"
if ./scripts/gate-error-budget.sh 5 10; then
    echo "✅ Deployment allowed with waiver."
    if grep -q "W-1234" audit/waivers.log; then
        echo "✅ Waiver usage audited."
    else
        echo "❌ Waiver usage NOT audited."
        exit 1
    fi
else
    echo "❌ Deployment blocked despite waiver."
    exit 1
fi

echo "G2 Proof Complete."

#!/bin/bash
set -e

echo "Running G1 SLO Alerting Proof..."

mkdir -p mocks/metrics
mkdir -p audit

echo "--- Scenario 1: Healthy System ---"
# 0.01% error rate vs 0.1% budget (Target 99.9%) -> Burn Rate 0.1x (Safe)
export MOCK_ERROR_RATE=0.0001
if ./scripts/slo-monitor.sh; then
    echo "✅ Monitor reported healthy as expected."
else
    echo "❌ Monitor triggered alert incorrectly!"
    exit 1
fi

echo "--- Scenario 2: High Burn Rate (Alert) ---"
# 2% error rate vs 0.1% budget -> Burn Rate 20x (Critical)
export MOCK_ERROR_RATE=0.02
if ./scripts/slo-monitor.sh; then
    echo "❌ Monitor failed to trigger alert!"
    exit 1
else
    exit_code=$?
    if [ $exit_code -eq 2 ]; then
        echo "✅ Alert triggered (Exit Code 2)."

        # Verify Audit Log
        if grep -q "type=slo_burn" audit/alert_log.json; then
             echo "✅ Audit log entry found."
        else
             echo "❌ Audit log entry missing!"
             exit 1
        fi
    else
        echo "❌ Unexpected exit code: $exit_code"
        exit 1
    fi
fi

echo "G1 Proof Complete."

#!/bin/bash
set -euo pipefail

# Palantir Drift Detector
# Runs the benchmark and checks against baselines.

SCENARIO="smoke"
OUTPUT_DIR="reports/palantir_drift"
mkdir -p "$OUTPUT_DIR"

echo "Running Palantir Benchmark Scenario: $SCENARIO"
export PYTHONPATH="${PYTHONPATH:-}:."
python3 scripts/bench/palantir.py --output-dir "$OUTPUT_DIR" --scenario "$SCENARIO"

# Simple drift check (mocked logic)
METRICS_FILE="$OUTPUT_DIR/reports/palantir/metrics.json"

if [ ! -f "$METRICS_FILE" ]; then
    echo "ERROR: Metrics file not found!"
    exit 1
fi

RUNTIME=$(grep -o '"runtime_ms": [0-9.]*' "$METRICS_FILE" | awk '{print int($2)}')
echo "Runtime: $RUNTIME ms"

# Example threshold check (e.g., must be < 500ms)
if [ "$RUNTIME" -gt 500 ]; then
    echo "FAIL: Runtime exceeded 500ms threshold!"
    exit 1
else
    echo "PASS: Runtime within limits."
fi

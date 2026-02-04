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
# Real benchmark is fast (~2ms for 10k nodes), so let's set a tight but safe limit
THRESHOLD=100
if [ "$RUNTIME" -gt "$THRESHOLD" ]; then
    echo "FAIL: Runtime exceeded ${THRESHOLD}ms threshold!"
    exit 1
else
    echo "PASS: Runtime within limits."
fi

# Schema Drift Check (Node Count)
NODE_COUNT=$(grep -o '"node_count": [0-9.]*' "$METRICS_FILE" | awk '{print int($2)}')
EXPECTED_NODES=10000

if [ "$NODE_COUNT" -ne "$EXPECTED_NODES" ]; then
    echo "FAIL: Node count drift detected! Expected $EXPECTED_NODES, got $NODE_COUNT"
    exit 1
else
    echo "PASS: Node count stable."
fi

# Apollo Release Gate Simulation
python3 -c "
from pathlib import Path
from summit.integrations.palantir_apollo import ReleaseGate, ReleaseChannel, ProductRelease, load_metrics

gate = ReleaseGate([ReleaseChannel(name='prod', requires_approval=True, sla_latency_ms=100)])
metrics = load_metrics(Path('$METRICS_FILE'))
release = ProductRelease(version='1.0.0', channel='prod', metrics=metrics)
decision = gate.evaluate_release(release)
print(f'Apollo Gate Decision: {decision}')
if 'NO-GO' in decision:
    exit(1)
"

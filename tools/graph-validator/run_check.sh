#!/bin/bash
set -e

# Ensure artifacts directory exists
mkdir -p /artifacts

BASELINE_FILE="/artifacts/degree_baseline.json"
REPORT_FILE="/artifacts/drift_report.json"

echo "Starting Graph Validator..."

# Check if baseline exists
if [ ! -f "$BASELINE_FILE" ]; then
    echo "Baseline not found. Creating baseline..."
    # Create a baseline from the current state
    python validator.py --mode baseline --baseline-path "$BASELINE_FILE" --sample-size 50000
else
    echo "Baseline found at $BASELINE_FILE"
fi

echo "Running validation..."
python validator.py --mode validate --baseline-path "$BASELINE_FILE" --sample-size 50000 --output "$REPORT_FILE"

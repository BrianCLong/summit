#!/bin/bash
set -e

echo "=== Workflow Determinism Gate ==="

# Run 1
npx tsx cli/src/summit.ts workflow validate /tmp/project1 --adapter dbt --run-id 123456789012
cp artifacts/workflow/report.json report1.json
cp artifacts/workflow/metrics.json metrics1.json

# Run 2
npx tsx cli/src/summit.ts workflow validate /tmp/project2 --adapter dbt --run-id 123456789012
cp artifacts/workflow/report.json report2.json
cp artifacts/workflow/metrics.json metrics2.json

# Compare
if diff report1.json report2.json && diff metrics1.json metrics2.json; then
    echo "✅ Determinism verified: artifacts are identical across runs."
    rm report1.json report2.json metrics1.json metrics2.json
else
    echo "❌ Determinism failure: artifacts differ across runs!"
    exit 1
fi

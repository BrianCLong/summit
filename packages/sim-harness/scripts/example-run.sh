#!/bin/bash
# Example: Run scenario evaluation
set -e

echo "🚀 IntelGraph Simulation Harness - Example Run"
echo "=============================================="

# Build harness
echo "Building harness..."
pnpm build

# Generate scenario data
echo ""
echo "Generating fraud-ring scenario..."
pnpm run-scenario generate \
  --scenario fraud-ring \
  --seed 42 \
  --output ./reports/fraud-ring-data.json

# Run evaluation (requires running IntelGraph stack)
echo ""
echo "Running evaluation..."
pnpm run-scenario run \
  --scenario fraud-ring \
  --seed 42 \
  --sessions 3 \
  --format all \
  --verbose \
  --output ./reports

echo ""
echo "✅ Done! Check ./reports/ for results"

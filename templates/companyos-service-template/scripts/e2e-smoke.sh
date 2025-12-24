#!/bin/bash
set -e

BASE_URL="${1:-http://localhost:3000}"

echo "Running smoke test against $BASE_URL..."

# Health check
echo "Checking /healthz..."
curl -f "$BASE_URL/healthz"
echo -e "\nHealth check passed!"

# Metrics check
echo "Checking /metrics..."
if curl -f "$BASE_URL/metrics" | grep -q "process_cpu_user_seconds_total"; then
  echo "Metrics check passed!"
else
  echo "Metrics check failed!"
  exit 1
fi

echo "E2E smoke test completed successfully."

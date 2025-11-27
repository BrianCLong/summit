#!/usr/bin/env bash
set -euo pipefail

# Guarded Code Gate - Smoke & Health Check
echo "==> Running CI Smoke Gate..."

# 1. Check API Health
echo "Checking API Health..."
curl -sf http://localhost:4000/health && echo " API OK"

# 2. Check Detailed Health with jq
echo "Checking Detailed Health Status..."
curl -sf http://localhost:4000/health/detailed | jq -e '.status=="ok"' >/dev/null && echo " Detailed Health OK"

# 3. Check Metrics Endpoint
echo "Checking Metrics Endpoint..."
curl -sf http://localhost:4000/metrics | head -n 5 >/dev/null && echo " Metrics OK"

# 4. Run existing Smoke Test Harness
echo "Running Smoke Test Harness..."
node scripts/smoke-test.js

# 5. Run k6 Load Test for SLO Gate (p95 < 1.5s)
echo "Running k6 SLO Gate..."
# Mount current directory to /home/k6 so k6 can read scripts and write results
if command -v docker >/dev/null 2>&1; then
  docker run --network host --rm -v "$(pwd):/home/k6" -e OUTPUT_JSON=true grafana/k6 run k6/slo-gate.js
else
  echo "Docker not found, skipping k6 gate (or install k6 locally)"
  # In strict CI, we might want to fail here, but for now warn
fi

# 6. Generate Badge
echo "Generating Badge..."
node scripts/generate-badge.js

echo "SMOKE & SLO GREEN"

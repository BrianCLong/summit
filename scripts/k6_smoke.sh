#!/usr/bin/env bash
set -euo pipefail
mkdir -p .github/k6
UI_URL=${UI_URL:-http://localhost:3000}
API_URL=${API_URL:-http://localhost:4000}
echo "Waiting for API Gateway ($API_URL) to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

until curl -s "$API_URL/healthz" > /dev/null; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "API Gateway failed to become healthy in time."
    exit 1
  fi
  echo "Still waiting ($RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done
echo "API Gateway is ready!"

command -v k6 >/dev/null 2>&1 || { echo "k6 not installed"; exit 1; }
UI_URL="$UI_URL" API_URL="$API_URL" k6 run .github/k6/smoke.js --summary-export .github/k6/summary.json

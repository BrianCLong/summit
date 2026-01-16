#!/bin/bash
# scripts/verify-deployment.sh
# Verifies the health of a deployment by checking the /health endpoint.

set -euo pipefail

TARGET_URL="${1:-http://localhost:3000}"
MAX_RETRIES="${2:-30}"
SLEEP_SECONDS="${3:-2}"

echo "🔍 Verifying deployment at $TARGET_URL..."

count=0
while [ $count -lt $MAX_RETRIES ]; do
  if curl -s -f "$TARGET_URL/health" > /dev/null; then
    echo "✅ Deployment is healthy!"
    exit 0
  fi
  
  echo "⏳ Waiting for service to become healthy... ($count/$MAX_RETRIES)"
  sleep $SLEEP_SECONDS
  count=$((count + 1))
done

echo "❌ Deployment verification failed after $MAX_RETRIES attempts."
exit 1
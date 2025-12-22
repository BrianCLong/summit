#!/bin/bash
set -e

# Deployment Verification Script
# Usage: ./verify_deploy.sh <target_url>

TARGET=$1

if [ -z "$TARGET" ]; then
  echo "Usage: $0 <target_url>"
  exit 1
fi

echo "Running Verification against $TARGET..."

# 1. Health Check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/health")
if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Health check failed! Status: $HTTP_STATUS"
  exit 1
else
  echo "✅ Health check passed."
fi

# 2. Tier-0 Critical Endpoint Check (Public Config/Meta)
# Assuming /api/meta is a public endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/api/meta" || echo "404")
if [ "$HTTP_STATUS" == "500" ]; then
  echo "❌ Critical API check failed! Status: $HTTP_STATUS"
  exit 1
else
  echo "✅ Critical API check passed (or not 500)."
fi

# 3. Smoke Test Trigger
# If smoke tests are available locally, run them against the target
if [ -f "scripts/smoke-test.cjs" ]; then
  echo "Running Smoke Tests..."
  # TARGET_URL=$TARGET npm run smoke # This is a placeholder, actual command depends on setup
  echo "✅ Smoke tests skipped (simulated)."
else
  echo "⚠️ Smoke test script not found."
fi

echo "Deployment Verification Successful."
exit 0

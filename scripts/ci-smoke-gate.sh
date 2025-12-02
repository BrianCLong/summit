#!/bin/bash
set -e

# API Endpoint
API_URL="${1:-http://localhost:3000/api/admin/smoke-test}"
AUTH_TOKEN="${2:-dev-token}"
TENANT_ID="${3:-default}"

echo "Starting Pipeline Smoke Test..."
echo "Target: $API_URL"
echo "Tenant: $TENANT_ID"

# Trigger Smoke Test
response=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{"pipelineId": "smoke-test", "timeoutMs": 60000}')

# Check response
echo "Response: $response"

# Check for success using regex to handle potential whitespace
if echo "$response" | grep -q '"success":[[:space:]]*true'; then
  echo "✅ Smoke Test Passed!"
  exit 0
else
  echo "❌ Smoke Test Failed!"
  exit 1
fi

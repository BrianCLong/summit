#!/bin/bash

# API Base URL
BASE_URL="http://localhost:8080/api/maestro/v1"

# Authentication Token (replace with your actual token)
AUTH_TOKEN="your_auth_token_here"

# --- 1. List all runs ---
echo "--- Listing all runs ---"
curl -X GET "${BASE_URL}/runs" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq .

echo ""

# --- 2. Start a new run ---
echo "--- Starting a new run ---"
PIPELINE_ID="example-pipeline"
ESTIMATED_COST=0.01
curl -X POST "${BASE_URL}/runs" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
        \"pipelineId\": \"${PIPELINE_ID}\",
        \"estimatedCost\": ${ESTIMATED_COST}
      }" \
  | jq .

echo ""

# --- 3. Get a specific run by ID ---
echo "--- Getting a specific run by ID ---"
RUN_ID="<REPLACE_WITH_ACTUAL_RUN_ID>" # Get this from the output of step 2
curl -X GET "${BASE_URL}/runs/${RUN_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq .

echo ""

# --- 4. Tail logs for a run (simplified) ---
echo "--- Tailing logs for a run (simplified) ---"
# Note: Real log tailing might involve SSE or WebSockets, this is a simple GET
curl -X GET "${BASE_URL}/runs/${RUN_ID}/logs?stream=true" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq .

echo ""

# --- 5. Explain policies (example) ---
echo "--- Explaining policies ---"
POLICY_ID="example-policy"
curl -X POST "${BASE_URL}/policies/explain" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
        \"policyId\": \"${POLICY_ID}\",
        \"context\": { \"user\": \"test-user\" }
      }" \
  | jq .

echo ""

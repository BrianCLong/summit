#!/bin/bash

# OPA Policy Enforcement Probe
# Calls a policy-protected API with a user lacking the case label; expects HTTP 403.

set -euo pipefail

TOKEN="$1"
CASE_ID="$2"
GQL_ENDPOINT="${GQL_ENDPOINT:-http://localhost:8080/graphql}" # Default GraphQL endpoint

if [ -z "$TOKEN" ] || [ -z "$CASE_ID" ]; then
  echo "Usage: $0 <API_TOKEN> <CASE_ID>"
  echo "  API_TOKEN: JWT or Maestro API token for authentication."
  echo "  CASE_ID: A case ID that the user should NOT have access to."
  exit 1
fi

echo "--- Running OPA Policy Probe ---"
echo "Target GraphQL Endpoint: $GQL_ENDPOINT"
echo "Using token: $TOKEN (first 5 chars)..."
echo "Attempting to execute runbook for case ID: $CASE_ID (expecting 403 Forbidden)"

# GraphQL query to attempt runbook execution
GRAPHQL_QUERY='{"query":"mutation{ runbookExecute(caseId:"'"$CASE_ID"'"){id}}"}'

# Make the curl request
RESPONSE=$(curl -s -o /dev/null -w "%{\http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST "$GQL_ENDPOINT" \
  -d "$GRAPHQL_QUERY")

echo "HTTP Status Code: $RESPONSE"

if [ "$RESPONSE" == "403" ]; then
  echo "✅ Policy probe PASSED: Received 403 Forbidden as expected."
  exit 0
else
  echo "❌ Policy probe FAILED: Expected 403 Forbidden, but received $RESPONSE."
  exit 1
fi

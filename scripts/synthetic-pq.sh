#!/bin/bash
# Synthetic check for persisted query health
# Calls GraphQL endpoint with a persisted query hash and checks response
# Usage: synthetic-pq.sh
# Env vars: GRAPHQL_URL, JWT, HASH_TENANT, TENANT_ID

set -euo pipefail

if [ -z "$GRAPHQL_URL" ] || [ -z "$JWT" ] || [ -z "$HASH_TENANT" ] || [ -z "$TENANT_ID" ]; then
  echo "Error: Missing required environment variables."
  exit 1
fi

echo "Running synthetic check for $GRAPHQL_URL"

RESPONSE=$(curl -s -w "%{\http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -H "X-Tenant-ID: $TENANT_ID" \
  --data-binary "{\"query\":\"#graphql\nquery TenantCoherence {\n  tenantCoherence(hash: \"$HASH_TENANT\") {\n    score\n  }\n}\n\"}" \
  "$GRAPHQL_URL")

HTTP_CODE="${RESPONSE:(-3)}"
BODY="${RESPONSE:0:$((${#RESPONSE}-3))}"

echo "HTTP Code: $HTTP_CODE"
echo "Response Body: $BODY"

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "Error: GraphQL endpoint returned non-200 status code."
  exit 1
fi

if ! echo "$BODY" | grep -q "score"; then
  echo "Error: Response body does not contain 'score'."
  exit 1
fi

echo "Synthetic check passed."

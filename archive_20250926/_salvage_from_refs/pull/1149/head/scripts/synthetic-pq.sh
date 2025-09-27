#!/usr/bin/env bash
set -euo pipefail
URL=${GRAPHQL_URL:-"https://gateway.example.com/graphql"}
JWT=${JWT:?"JWT required"}
HASH=${HASH_TENANT:?"Persisted query hash required"}
TENANT=${TENANT_ID:-"tenant-123"}

curl -fsS -H 'Content-Type: application/json' -H "Authorization: Bearer $JWT" \
  -d '{"operationName":"tenant","variables":{"tenantId":"'
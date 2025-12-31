# Minimal API Client (Safe Defaults)

This example fetches a tenant-scoped token, runs a single agent call with per-run caps, and prints provenance.

## Run

```bash
ACCESS_TOKEN=${ACCESS_TOKEN:-$(jq -r '.access_token' onboarding-state.json)}
TENANT_ID=${TENANT_ID:-$(jq -r '.tenant_id' onboarding-state.json)}

curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Summit-Tenant: $TENANT_ID" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/agents/run" \
  -d '{
    "agent_id":"hello-world",
    "cost_cap_cents":50,
    "timeout_ms":20000,
    "input":{"prompt":"say hello"}
  }' | tee run-response.json

PROV=$(jq -r '.provenance_ref' run-response.json)
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$SUMMIT_API_BASE/provenance/$PROV" | jq
```

The call fails fast if the policy layer denies the request or if the cost cap would be exceeded.

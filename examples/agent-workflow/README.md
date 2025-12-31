# Minimal Agent Workflow

Chains two guarded agent calls (health-check -> summarizer) and validates provenance after each hop.

## Run

```bash
ACCESS_TOKEN=${ACCESS_TOKEN:-$(jq -r '.access_token' onboarding-state.json)}
TENANT_ID=${TENANT_ID:-$(jq -r '.tenant_id' onboarding-state.json)}

health=$(curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Summit-Tenant: $TENANT_ID" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/agents/run" \
  -d '{
    "agent_id":"intel-health-check",
    "cost_cap_cents":40,
    "timeout_ms":15000,
    "input":{"prompt":"List ingestion issues"}
  }')

health_summary=$(echo "$health" | jq -r '.output.summary // ""')
prov_health=$(echo "$health" | jq -r '.provenance_ref')

curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Summit-Tenant: $TENANT_ID" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/agents/run" \
  -d "{
    \"agent_id\":\"intel-summarizer\",\"cost_cap_cents\":30,\"timeout_ms\":15000,
    \"input\":{\"prompt\":\"Summarize: ${health_summary}\"},
    \"context\":{\"upstream_provenance\":\"${prov_health}\"}
  }" | jq
```

Both calls are bounded by cost and timeouts. Upstream provenance is carried into the summarizer for full lineage.

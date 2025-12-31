# How To: Run an Agent Safely

## Preflight

1. Use a service account token with `agent:invoke`, `provenance:read`, and `billing:read`.
2. Confirm tenant budget cap and rate limits are set (see onboarding quickstart).
3. Pin the agent version or policy bundle hash to avoid drift.

## Execute a Guarded Run

```bash
curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Summit-Tenant: $TENANT_ID" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/agents/run" \
  -d '{
    "agent_id": "intel-health-check",
    "agent_version": "2025-01-01",
    "input": {"prompt": "Summarize ingestion health"},
    "policy_bundle": "sha256:...",
    "cost_cap_cents": 50,
    "timeout_ms": 20000
  }' | jq
```

- Always set `cost_cap_cents` and `timeout_ms` per run.
- Keep `agent_version` pinned; update deliberately.

## Validate Results

Check provenance:

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$SUMMIT_API_BASE/provenance/$PROVENANCE_REF" | jq '.policy_decisions, .cost'
```

- Ensure all `policy_decisions[].verdict` are `allow`.
- Confirm `cost.actual_cents <= cost_cap_cents`.

## Fail Safe Behavior

If a run is denied, the response includes policy IDs and remediation. Avoid retry loops without inspection; repeated denials count toward rate limits.

# Quickstart: Safe Onboarding in Under 30 Minutes

This quickstart guides a new tenant through provisioning, authentication, and a first safe run with cost and provenance visibility. All steps are idempotent and stick to minimal scopes, conservative rate limits, and default cost caps.

## Prerequisites

- Access to a Summit control plane endpoint (e.g., `https://api.summit.local`)
- `curl` and `jq` installed
- An operator or platform admin token that can create tenants and service accounts
- A workspace-local `.env` containing:
  - `SUMMIT_API_BASE`
  - `PLATFORM_ADMIN_TOKEN`
  - `DEFAULT_BUDGET_CENTS` (e.g., `500` for $5.00)
  - `DEFAULT_RATE_LIMIT_RPS` (e.g., `5`)

## One-Click Provisioning

Run the onboarding helper script. It is idempotent: repeated runs update existing resources instead of duplicating them.

```bash
scripts/onboarding/quickstart.sh \
  --tenant "demo-tenant" \
  --service-account "demo-tenant/sa-quickstart" \
  --role "agent-runner" \
  --budget "$DEFAULT_BUDGET_CENTS" \
  --rps "$DEFAULT_RATE_LIMIT_RPS"
```

### What the script does

1. Creates or reuses the tenant.
2. Creates or reuses a service account scoped to the tenant.
3. Issues short-lived credentials with minimal scopes:
   - `agent:invoke` (run agents)
   - `provenance:read` (observe runs)
   - `billing:read` (view cost consumption)
4. Applies conservative defaults:
   - Budget cap enforced at the tenant level
   - Rate limiting set to the provided RPS value
5. Emits a local `onboarding-state.json` so reruns patch the existing setup rather than recreate it.

## First API Call (Hello, Agent)

Use the scoped credentials from the previous step. The example below triggers a minimal agent run and demonstrates the provenance handle returned with the response.

```bash
ACCESS_TOKEN=$(jq -r '.access_token' onboarding-state.json)
TENANT_ID=$(jq -r '.tenant_id' onboarding-state.json)

curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Summit-Tenant: $TENANT_ID" \
  -H "Content-Type: application/json" \
  "$SUMMIT_API_BASE/agents/run" \
  -d '{"agent_id":"hello-world","input":{"prompt":"Run a health check"}}' | jq
```

Expected response (truncated):

```json
{
  "run_id": "run_12345",
  "status": "accepted",
  "provenance_ref": "prov_abcde",
  "estimated_cost_cents": 12
}
```

## Verify Provenance and Cost

```bash
curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Summit-Tenant: $TENANT_ID" \
  "$SUMMIT_API_BASE/provenance/prov_abcde" | jq
```

Outputs include input hash, policy decisions, lineage, and the cost ledger. Confirm the run stayed within the cap and that all policy checks passed.

## Clean Up (Optional)

To undo the quickstart setup, run:

```bash
scripts/onboarding/quickstart.sh --tenant "demo-tenant" --destroy
```

The script revokes credentials, removes the service account, and marks the tenant for teardown (non-destructive by default; production tenants require an explicit `--force`).

## Troubleshooting

- **Policy denial**: Check the response `policy_decisions[]`; scopes may need to include `data:read` for ingestion workflows.
- **Rate limit hits**: Lower concurrency or raise `--rps` within your policy envelope.
- **Budget cap hit**: Increase `--budget` or tighten prompts to reduce token usage.

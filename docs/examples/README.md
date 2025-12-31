# Reference Examples (Safe by Default)

These examples mirror production authentication, policy enforcement, and cost controls. Each example includes provenance capture and conservative defaults.

## Minimal API Client

- Location: `examples/api-client`
- Purpose: Fetches a tenant-bound token and issues a single agent run with per-request cost and timeout caps.
- Defaults: `agent:invoke`, `provenance:read`, `billing:read`; 50 cent per-run cap; 5 RPS.

## Minimal Agent Workflow

- Location: `examples/agent-workflow`
- Purpose: Chains a health-check agent and a summarizer, verifying provenance after each hop.
- Defaults: Explicit `cost_cap_cents` and `timeout_ms` on every invocation.

## Minimal Plugin

- Location: `examples/plugin`
- Purpose: Read-only analytics plugin that surfaces provenance summaries via the Partner API.
- Defaults: Read-only scopes; outbound callbacks restricted to an allowlist.

## Analytics Read-Only Dashboard

- Location: `examples/analytics-dashboard`
- Purpose: Displays onboarding adoption signals (time to first success, denials, cost cap hits) using read-only credentials.
- Defaults: `provenance:read` only; dashboards refresh no faster than every 60 seconds.

## Running the Examples

1. Export a scoped token and tenant ID:
   ```bash
   export ACCESS_TOKEN=$(jq -r '.access_token' onboarding-state.json)
   export TENANT_ID=$(jq -r '.tenant_id' onboarding-state.json)
   ```
2. Follow the README in each example directory; each script exits on policy violations and emits provenance references.
3. Inspect provenance using `docs/how-to/query-provenance.md` to confirm governance compliance.

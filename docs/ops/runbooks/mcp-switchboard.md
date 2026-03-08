# Runbook: Summit Switchboard (MCP)

## Purpose
Operate Summit Switchboard (MCP) safely with feature flags, allowlists, and deterministic evidence
artifacts. This runbook is scoped to the MCP control-plane and does not modify the ingestion
Switchboard.

## Readiness Reference
Operate under the Summit Readiness Assertion and follow governance evidence requirements.

## Enablement
1. Set `SWITCHBOARD_MCP_ENABLED=true` in the runtime environment.
2. Provide an allowlisted config that defines child MCP servers and entrypoints.
3. Restart the MCP host process and verify health gate results.

## Add a Child MCP Server
1. Add the child definition to the allowlist config (absolute entrypoint only).
2. Validate config in CI with the deny-by-default policy.
3. Deploy config, then request tool discovery via `tools/list`.

## Health Checks
- A child marked unhealthy must not receive routed calls.
- Investigate health status via the report artifact and logs (redacted).

## Evidence Artifacts
Expect deterministic artifacts at:
- `artifacts/switchboard-mcp/report.json`
- `artifacts/switchboard-mcp/metrics.json`
- `artifacts/switchboard-mcp/stamp.json`

## Drift Monitoring
- Run the drift detector to hash normalized tool schemas.
- Alert on hash changes beyond allowlisted deltas.

## Troubleshooting
- **Unhealthy child:** verify entrypoint allowlist, check startup latency, confirm health endpoint.
- **Tool missing:** confirm lazy expansion, then call `list_subtools` on the suite tool.
- **Secret redaction failure:** fail CI and regenerate artifacts after fixing redaction policy.

## Rollback
1. Remove the child from the allowlist config.
2. Set `SWITCHBOARD_MCP_ENABLED=false`.
3. Redeploy and confirm no suite tools appear in `tools/list`.

## SLO Targets (Initial)
- `tools/call` p95 < 2s (local).
- Error rate < 1%.

## Escalation
- If health gate fails repeatedly, disable the flag and open a governance incident.

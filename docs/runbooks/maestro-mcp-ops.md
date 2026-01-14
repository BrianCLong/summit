# Maestro MCP — Operator One-Pager

## Env Vars

- `MAESTRO_MCP_ENABLED=true` — enable MCP routes
- `SESSION_SECRET` — HMAC key for session tokens (required)
- `SESSION_TTL_SECONDS=3600` — session TTL (default 1h)
- `MCP_SESSIONS_PERSIST=true` — persist sessions in Postgres (optional)
- `CORS_ORIGIN` — allowed origins for UI

## Health & Probes

- Liveness: `GET /api/health` (200 when process up)
- Readiness: `GET /api/ready` (200 when PG/Redis reachable; 503 otherwise)

## Smoke Steps

1. Create MCP server (requires `admin:mcp`):
   - `POST /api/maestro/v1/mcp/servers { name, url, scopes?, tags? }`
2. List servers: `GET /api/maestro/v1/mcp/servers`
3. Health: `GET /api/maestro/v1/mcp/servers/:id/health`
4. Create session: `POST /api/maestro/v1/runs/<runId>/mcp/sessions` with `{ "scopes": ["mcp:invoke"] }`
5. Invoke tool: `POST /api/maestro/v1/runs/<runId>/mcp/invoke` (Bearer <token>)
6. UI: `/mcp/registry` + Conductor Studio → “Tools & Evidence” tab

## Rollback

- Set `MAESTRO_MCP_ENABLED=false` and restart the server to disable MCP endpoints.

## Observability

- Metrics: `mcp_sessions_total` (created|revoked), `mcp_invocations_total` (success|error)
- Dashboard JSON: `docs/observability/grafana/mcp-dashboard.json`
- Traces: spans `mcp/servers` and `mcp/runs` (route middleware), plus invoke/session spans with labels

## Security

- Registry POST/PUT/DELETE requires `admin:mcp` or ADMIN role (dev)
- Redacts `Authorization`, `X-API-Key`, `Set-Cookie`, and token fields from logs

## gRPC Transport Troubleshooting

### Timeouts / DEADLINE_EXCEEDED

- Confirm client deadlines (`MCP_GRPC_DEFAULT_DEADLINE_MS`) match expected tool latency.
- Validate server-side saturation; reduce `MCP_GRPC_MAX_IN_FLIGHT` if overload occurs.

### TLS / mTLS Errors

- Verify `MCP_GRPC_TLS_CERT`, `MCP_GRPC_TLS_KEY`, and `MCP_GRPC_TLS_CA` paths.
- Ensure cert CN/SAN matches the gRPC address and client trusts the CA bundle.

### Auth / Policy Denies

- Confirm `authorization: Bearer <token>` is set in gRPC metadata.
- Check OPA responses and policy receipts (`x-ig-policy-receipt`) for decision context.

## Persistence

- Optional PG table `mcp_sessions` stores sid/run/scopes/servers/exp/revoked_at when `MCP_SESSIONS_PERSIST=true`
- Cleanup job deletes expired sessions automatically

## Contact

- On-call: SRE / Platform
- Escalation: Security for permission issues; Data for MCP server configs

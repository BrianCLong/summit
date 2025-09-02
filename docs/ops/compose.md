# Maestro — One-command Docker Compose

This stack brings up Postgres, Redis, Maestro server, client, OTEL Collector, Prometheus, and Grafana with a single command.

## Prereqs
- Docker Desktop (or Docker Engine) and Docker Compose v2

## Start

- `make up`
- Visit:
  - UI: http://localhost:3000
  - Server metrics: http://localhost:4000/metrics
  - Prometheus: http://localhost:9090
  - Grafana: http://localhost:3001 (admin / grafana)

## What it does
- Postgres + Redis start
- Server starts with feature flags enabled (`MAESTRO_MCP_ENABLED=true` etc.)
- `db-migrate` applies SQL migrations in `server/src/db/migrations/postgres` and seeds from `deploy/db/seed.sql`
- OTEL Collector accepts OTLP (traces/metrics) and logs them
- Prometheus scrapes server `/metrics` and loads alert rules
- Grafana is pre-wired with a Prometheus datasource and loads the MCP dashboard
- OPA is started with Rego policies (deploy/opa/policies) and the server uses OPA_BASE_URL to fetch policy hints

## Environment overrides
Edit `docker-compose.mcp.yml` to adjust:
- `SESSION_SECRET`, `SESSION_TTL_SECONDS`
- `MCP_SESSIONS_PERSIST` (true for multi-node)
- `MCP_ALLOWED_HOSTS` (CSV allowlist)
- `CORS_ORIGIN` (UI URL)

## Stop / logs
- `make logs` to tail logs
- `make down` to stop and remove volumes

## Apply DB migrations in a running stack
- `docker compose -f docker-compose.mcp.yml run --rm db-migrate`

## Load testing (k6)
- `k6 run scripts/k6/mcp_slo.js` (set BASE=http://localhost:4000/api/maestro/v1)

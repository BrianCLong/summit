# Environment Variables

This document highlights the environment variables that matter most for the
local dev kit and smoke test workflows. Copy `.env.example` to `.env` and adjust
as needed.

## Dev Kit Essentials

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `DEV_TENANT_ID` | `tenant-dev` | Controls the tenant ID used by deterministic seeds and the `dev-token` authentication context. |
| `OTEL_SERVICE_NAME` | `intelgraph-api` | Name reported to Jaeger/OpenTelemetry exporters; used by the smoke test when verifying traces. |
| `OTEL_SERVICE_VERSION` | `devkit` | Version tag surfaced in trace metadata and metrics for local builds. |
| `OTEL_ENABLED` | `true` | Toggles OpenTelemetry instrumentation in the API container. Leave enabled for smoke coverage. |
| `PROMETHEUS_ENABLED` | `true` | Enables the `/metrics` endpoint consumed during the smoke test. |
| `PROMETHEUS_PORT` | `9464` | Port exposed by the API container for Prometheus metrics scraping. |
| `METRICS_PORT` | `9090` | Prometheus server port within the dev compose stack. |
| `JAEGER_ENDPOINT` | `http://localhost:14268/api/traces` | Collector endpoint used by the API to publish spans. |

## Database & Auth Quick Reference

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `POSTGRES_HOST` | `localhost` | Compose exposes Postgres on the host for CLI access. |
| `POSTGRES_USER` | `intelgraph` | Matches deterministic seed credentials. |
| `POSTGRES_PASSWORD` | `devpassword` | Safe for local use only. |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j bolt endpoint exposed by compose. |
| `JWT_SECRET` | `your_jwt_secret_key_change_in_production_12345` | Development-only secret; do not reuse in staging/prod. |

### Tips

- Update `DEV_TENANT_ID` only if you re-run the seeds with a different tenant
  slug. Otherwise the `dev-token` will fail authorization checks.
- When editing observability values (ports, service name), re-run `./dev up` to
  recreate containers and `./dev test` to confirm Jaeger/Prometheus still pass.

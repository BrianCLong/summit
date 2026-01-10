---
title: "Operations"
summary: "Deployment, runbook, and observability workflows for MVP-4 GA."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "ops"
---

# Operations

## Deployment

- **Docker Compose (dev/prod)**: `make up` uses `docker-compose.dev.yaml` to start gateway, UI, policy compiler, AI NLQ, ER service, ingest, zk-tx, prov-ledger, and predictd.
- **Base services**: `docker-compose.yml` provisions Neo4j, Postgres, Redis, prov-ledger, policy-lac, nl2cypher, and report-studio.

## Runbook

1. Start services: `make up`
2. Smoke test: `make smoke`
3. Deep health: `scripts/health-check.sh` (checks Docker services, HTTP endpoints, and DB connectivity).
4. Stop services: `make down`
5. Backup artifacts: `npm run backup`

## Observability

- Configure OTLP exporters with `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` in `server/.env`.
- Service name defaults to `intelgraph-server` via `OTEL_SERVICE_NAME`.

## Next steps

- Keep configs aligned via the [how-to](../how-tos/validate-config.md).
- Review [Troubleshooting](../troubleshooting/README.md) for failure scenarios.

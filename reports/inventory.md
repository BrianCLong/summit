# Summit Repo Inventory (initial)

Generated: initial pass based on core orchestrator files. Will expand with workspace/package scans and scripts enumeration.

## Golden-Path Commands (from `Makefile`)
- **bootstrap**: Node (corepack/pnpm or npm) and Python venv setup, lightweight yq-json helper.
- **up**: If `docker-compose.yml` or `compose.yml` present, `docker compose up -d`.
- **smoke**: Runs JS/TS tests if present (`npm test`), optional pytest, and simple Node/Python canaries.

Sources: `Makefile`

## Core Compose (root `docker-compose.yml`)
- **postgres**: 5432; db `intelgraph_dev`, user `intelgraph`. Healthcheck `pg_isready`.
- **redis**: 6379; healthcheck `redis-cli ping`.
- **neo4j**: 7474 (HTTP), 7687 (Bolt); plugins apoc + gds. Healthcheck via `cypher-shell`.
- **opa**: 8181; policy volume `./policy/opa`.
- **jaeger**: 16686 UI; OTLP enabled.
- **otel-collector**: 4317/4318/9464; depends on Jaeger.
- **mock-services**: 4010; serves mock endpoints with healthcheck.
- **migrations**: built from `./server`; runs `scripts/db_migrate.cjs` against Postgres + Neo4j.
- **seed-fixtures**: seeds Postgres/Neo4j and OPA after migrations.
- **api**: Node dev, port 4000; env wires Postgres/Redis/OPA/OTel; health `/health`.
- **ui**: Vite dev server on 3000; `VITE_API_URL=http://api:4000`; health via wget.
- **worker**: Node worker on 4100; Redis + OTEL.
- **prometheus**: 9090; config at `ops/observability/prometheus.yml`.
- **grafana**: 8080 -> 3000; dashboards/datasources provisioned.
- **zookeeper**: 2181; profile `kafka`,`ai`.
- **kafka**: 9092/29092; profile `kafka`,`ai` with healthcheck.
- **ingestion-service**: build `./ingestion`; profile `kafka`,`ai`.
- **nlp-service**: build `./nlp-service`; profile `ai`.
- **reliability-service**: 8001; depends on kafka/redis; profile `kafka`,`ai`.

Volumes: `postgres_data`, `redis_data`, `neo4j_*`, `prometheus_data`, `grafana_data`.

Sources: `docker-compose.yml`

## Secondary Compose (`compose/docker-compose.yml`)
- **opa**: 8181
- **mc**: builds `../server`, exposes 4000, depends on OPA
- **cos**: builds `../companyos`, consumes OPA and MC
- **prom**: 9090
- **grafana**: 3001 -> 3000
- **synthetic**: node traffic generator to `MC_URL=http://mc:4000/graphql`

Sources: `compose/docker-compose.yml`

## Ports Summary
- **UI**: 3000
- **GraphQL/API**: 4000
- **Neo4j**: 7474 (HTTP), 7687 (Bolt)
- **Postgres**: 5432
- **Redis**: 6379
- **Grafana**: 8080 (and 3001 in `compose/` stack)
- **Prometheus**: 9090
- **Jaeger**: 16686
- **Worker**: 4100
- **Mock Services**: 4010
- **OPA**: 8181
- **Kafka**: 9092/29092

## Service Entry Points
- **API**: `server/` with `npm run dev` (via container). Health: `http://localhost:4000/health`.
- **UI**: `client/` with `npm run dev` Vite (`--host 0.0.0.0 --port 3000`).
- **Migrations**: `server/scripts/db_migrate.cjs`.
- **Seed**: `scripts/devkit/seed-fixtures.js` from repo root.

## Observability
- **OTel Collector**: `ops/devkit/otel-collector.yaml`.
- **Prometheus**: `ops/observability/prometheus.yml`.
- **Grafana**: `ops/observability/grafana/{dashboards,datasources}`.

## Security & Policy
- **OPA**: policies mounted from `policy/opa` (root compose), `cos` references MC policy pack.

## Next Steps
- Enumerate all `package.json` scripts across workspaces.
- Map TypeScript configs and ESM/CJS boundaries.
- Expand this inventory with connectors, charts, db migrations, and test suites.

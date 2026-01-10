# How to Navigate the Repo (1-page)

## Start here

- **Golden path**: `make bootstrap && make up && make smoke` (from root) stands up API, UI, Neo4j, Postgres, Redis, and observability with Compose.【F:README.md†L34-L57】【F:ARCHITECTURE_MAP.generated.yaml†L40-L199】
- **Architecture map**: See `ARCHITECTURE_MAP.generated.yaml` for active services, data stores, observability, and optional profiles.【F:ARCHITECTURE_MAP.generated.yaml†L35-L440】

## Core services and entrypoints

- **GraphQL API** — `server/src/index.ts`; compose service `api` on port 4000. Runs Apollo/Express, WebSockets, telemetry, and serves the built UI in production.【F:server/src/index.ts†L1-L160】【F:server/src/index.ts†L136-L145】【F:ARCHITECTURE_MAP.generated.yaml†L40-L80】
- **Web UI** — `client/` React/Vite SPA; compose service `ui` on port 3000.【F:ARCHITECTURE_MAP.generated.yaml†L82-L115】
- **Background Worker** — `server/src/conductor/worker-entrypoint.ts`; compose service `worker` on port 4100 for BullMQ jobs.【F:ARCHITECTURE_MAP.generated.yaml†L116-L142】

## Data layer

- **Neo4j** (graph) — compose service `neo4j`; data volumes under `neo4j_*`. Connect via bolt `7687` or HTTP `7474`.【F:ARCHITECTURE_MAP.generated.yaml†L184-L209】
- **PostgreSQL** (metadata/audit/embeddings) — migrations in `server/db/migrations/postgres`; compose service `postgres` on `5432` with `pgvector`.【F:ARCHITECTURE_MAP.generated.yaml†L147-L160】
- **Redis** (cache/queues) — compose service `redis` on `6379` for sessions, rate limiting, and BullMQ queues.【F:ARCHITECTURE_MAP.generated.yaml†L166-L182】

## Security & policy

- **OPA** — policies in `policy/opa/`; compose service `opa` on `8181` for authorization decisions consumed by the API.【F:ARCHITECTURE_MAP.generated.yaml†L284-L299】
- **Secrets bootstrap** — `server/src/bootstrap-secrets.ts` invoked before API start; ensure required env vars are set.【F:server/src/index.ts†L52-L59】

## Observability

- **OTEL Collector** (`ops/devkit/otel-collector.yaml`) receives traces/metrics; exports to **Prometheus** (`observability/prometheus`) and **Jaeger** with **Grafana** dashboards for visualization.【F:ARCHITECTURE_MAP.generated.yaml†L211-L278】

## Deployment surfaces

- **Docker Compose** — default topology (`docker-compose*.yml`) plus profiles `ai`/`kafka` for optional services.【F:ARCHITECTURE_MAP.generated.yaml†L40-L440】【F:ARCHITECTURE_MAP.generated.yaml†L341-L440】
- **Kubernetes** — manifests under `kubernetes/` for cluster deployments; keep aligned with Compose defaults.【F:ARCHITECTURE_MAP.generated.yaml†L720-L734】

## Documentation hubs

- `docs/architecture/` — architecture decisions, diagrams, and topology guides (see `README.md` in this directory for index).【F:docs/architecture/README.md†L1-L36】
- `docs/` root — onboarding, API references, governance, and release docs; `ARCHITECTURE_MAP.generated.yaml` links to key guides.【F:README.md†L112-L119】【F:ARCHITECTURE_MAP.generated.yaml†L732-L740】

Use this map to jump directly to the code, configs, and run commands needed to answer "where is X?" without trawling the full monorepo.

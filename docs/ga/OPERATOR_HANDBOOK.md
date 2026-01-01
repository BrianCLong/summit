# GA Operator Handbook

This handbook is the single source of truth for bringing a fresh clone of Summit to a production-ready, on-call-ready state with zero tribal knowledge.

## Production deployment paths

### Docker Compose (prod-like bootstrap)

1. **Clone and prepare**
   ```bash
   git clone https://github.com/BrianCLong/summit.git && cd summit
   cp .env.example .env
   make bootstrap
   ```
2. **Start the stack**
   ```bash
   make up           # uses docker-compose.dev.yaml by default
   make smoke        # waits, then probes UI + gateway health
   ```
3. **What good looks like**
   - `docker compose ps` shows all services `Up`.
   - `curl http://localhost:3000` returns HTML for the UI.
   - `curl http://localhost:8080/healthz` or `/health` returns 200 OK with `{ "status": "ok" }`.
   - `docker compose logs -f gateway` shows readiness without restart loops.

### Kubernetes / Helm

1. **Charts** live under `charts/`:
   - `charts/ig-platform` (umbrella) for API/UI/data plane.
   - `charts/gateway`, `charts/server`, `charts/observability`, and `charts/backup` for component overrides.
2. **Bootstrap**

   ```bash
   # Ensure kube context set to target cluster
   kubectl get nodes

   # Render and review values
   helm show values charts/ig-platform > /tmp/ig-values.yaml
   # Edit /tmp/ig-values.yaml with cluster-specific hosts, storage, and secrets references

   # Install/upgrade
   helm upgrade --install summit charts/ig-platform -f /tmp/ig-values.yaml
   ```

3. **Verification**
   ```bash
   kubectl get pods -n <ns>               # all Running/Ready
   kubectl port-forward svc/gateway 8080:80 -n <ns>
   curl -f http://localhost:8080/health/ready
   ```
   Helm release is healthy when pods are Ready, `/health/ready` returns `{"status":"ready"}`, and logs show migrations completed.

### Required environment and secrets (minimum viable prod)

Provide via Kubernetes secret manager (SealedSecrets/External Secrets) or Compose `.env`:

| Purpose       | Variable                                                                              | Notes                                          |
| ------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Postgres      | `DATABASE_URL`                                                                        | Primary DSN with credentials.                  |
| Neo4j         | `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`                                           | Set to production endpoints.                   |
| Redis         | `REDIS_URL` _or_ (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)                       | For cache/queues.                              |
| Auth          | `JWT_SECRET`, `SESSION_SECRET`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | Rotate regularly; store in vault.              |
| Rate limits   | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `AI_RATE_LIMIT_MAX_REQUESTS`                | Tighten for internet-facing tenants.           |
| Telemetry     | `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`           | Point to collector; ensure TLS where required. |
| Feature flags | `AI_ENABLED`, `MAESTRO_MCP_ENABLED`, `MAESTRO_PIPELINES_ENABLED`                      | Gate optional workloads.                       |
| TLS/Ingress   | `TLS_KEY_PATH`, `TLS_CERT_PATH` (or cert-manager refs)                                | Required for public ingress.                   |

**Secure storage guidance**: never commit secrets; prefer cloud secret stores (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault). Restrict access via RBAC; enable audit logging on secret reads. Store backups encrypted (SSE-KMS) and rotate keys quarterly.

### Bootstrap and verification sequence

1. `make bootstrap` – installs Python venv dependencies and `pnpm` workspace tooling.
2. `make up` – builds and launches the prod-like Docker Compose stack.
3. `make smoke` – waits 45s then probes UI (port 3000) and Gateway health (8080/healthz).
4. `kubectl/helm` – once Helm deployed, re-run smoke against ingress VIP and confirm service DNS resolves.

**Logs & metrics**

- **Logs**: `docker compose logs -f <service>` locally; `kubectl logs -n <ns> deploy/gateway` in K8s; structured JSON is scraped by Prometheus/Grafana via `compose/prometheus` + `compose/grafana` or `charts/observability`.
- **Metrics**: Prometheus at `http://localhost:9090` (Compose) or `prometheus-server` service; Grafana dashboards auto-provisioned from `observability/grafana/dashboards` and surfaced on `http://localhost:3001` (Compose) or `charts/grafana` ingress.

## Health probes and dependency meanings

- `GET /health` – liveness; returns `status: ok` when the process is running.
- `GET /health/detailed` – deep checks; marks **Neo4j**, **Postgres**, or **Redis** as `unhealthy` and sets `status: degraded` if connectivity fails. Failed Neo4j ⇒ graph queries blocked; failed Postgres ⇒ API writes/reads halted; failed Redis ⇒ cache/queue degraded and request latency may increase.
- `GET /health/ready` – readiness; returns 503 with `failures` array when any critical dependency (Neo4j/Postgres/Redis) is unavailable; Kubernetes should keep pods out of rotation until it returns `{"status":"ready"}`.

## Config & secrets reference (prod-minimum)

- **Database**: `DATABASE_URL` (write), `DATABASE_READ_REPLICAS` (comma-separated). Tune pools via `PG_WRITE_POOL_SIZE`, `PG_READ_POOL_SIZE`, `PG_MAX_LIFETIME_MS` for connection churn.
- **Graph database**: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`.
- **Cache/queues**: `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`.
- **Security**: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY` (rotate quarterly; keep in vault).
- **Identity**: `OIDC_*` variables for SSO; align redirect URIs with ingress host.
- **CORS**: `ALLOWED_ORIGINS` to restrict cross-origin access.
- **Rate limiting**: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `AI_RATE_LIMIT_MAX_REQUESTS`, `BACKGROUND_RATE_LIMIT_MAX_REQUESTS` to throttle API, AI, and background tasks.
- **Telemetry**: `OTEL_*` endpoints, `LOG_LEVEL` for verbosity.
- **Feature toggles**: `AI_ENABLED`, `KAFKA_ENABLED`, `MAESTRO_MCP_ENABLED`, `MAESTRO_PIPELINES_ENABLED`.
- **TLS**: `TLS_KEY_PATH` / `TLS_CERT_PATH` or Kubernetes secrets for ingress controllers.

## Backup, restore, and disaster recovery

- **Backups**
  - Standardized script: `scripts/backup/backup.sh --env=production --datastores=postgresql,neo4j,redis --backup-type=full --component=all --verify --cleanup`.
  - Minimal Postgres-only: `scripts/ops/backup_postgres.sh` (writes encrypted dumps under `backups/postgres`).
  - Neo4j local dump: `scripts/backup/neo4j_backup.sh` (stores under `backups/neo4j`).
- **Restore**
  - Orchestrated restore: `scripts/db/restore.sh --env=staging --backup-path=./backups/<id> --datastores=postgres,neo4j` (add `--confirm-production` when targeting prod).
  - Service-specific restores: `scripts/restore/postgres_restore.sh <path.sql>` and `scripts/restore/neo4j_restore.sh <path.dump>`; Redis via `scripts/restore/redis_restore.sh <path.rdb>`.
- **DR drill**
  - Verify last backup freshness with `scripts/ops/backup_restore_drill.sh` and `scripts/gates/production-gate-witness.sh` (produces evidence for backup recency and verification).

## Scaling & reliability knobs

- **Rate limits**: tighten `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS` for general API traffic; set `AI_RATE_LIMIT_MAX_REQUESTS` lower for expensive AI calls; adjust `BACKGROUND_RATE_LIMIT_MAX_REQUESTS` for worker endpoints.
- **GraphQL complexity**: enforce via middleware defaults; reduce allowed complexity or depth in `graphql-hardening` configs if tenants submit heavy queries. If `/health/detailed` shows cache/optimizer variants, consider enabling cache strategy for read-heavy workloads.
- **Caching**: Redis-backed cache; increase Redis memory and enable eviction policy to reduce latency; ensure `REDIS_URL` points to highly available nodes before scaling app replicas.
- **Queue workers**: scale worker deployments or pods when background job latency or queue depth grows; monitor via `/queues/health` if enabled and Prometheus metrics.
- **Database pools**: increase `PG_WRITE_POOL_SIZE`/`PG_READ_POOL_SIZE` cautiously as replicas are added; reduce if connections exhaust Postgres or cause lock contention.
- **Application replicas**: scale gateway/API deployments horizontally once DB/Redis headroom confirmed; use HPA on CPU + p95 latency.

## Golden Path commands

- `make bootstrap` – provision toolchain; expect pip + pnpm installs to complete without errors.
- `make up` – starts Docker Compose stack; expect `docker compose ps` to show all services `Up` and listening on documented ports.
- `make smoke` – waits 45s then verifies UI (port 3000) and gateway health (8080). Success output shows `✅ UI is up` and `✅ Gateway is up`.
- `make logs` (via `docker compose logs -f <service>`) for troubleshooting; `make down` to reset the stack.

## Verification after deployment

- Health: `/health`, `/health/detailed`, `/health/ready` all return 200 with `status: ok/ready` and all dependencies `healthy`.
- Data plane: run a sample GraphQL query via `/graphql` and confirm writes land in Postgres/Neo4j.
- Observability: Grafana dashboards populate; Prometheus targets are `UP`; logs stream without error bursts.

## GA mini-checklist

- Monitoring: Prometheus + Grafana deployed; alerts wired for health/readiness, error rates, and latency.
- Alerts: paging for elevated 5xx, dependency outages (Postgres/Neo4j/Redis), queue backlog, and AI provider errors.
- Backups: daily full backups verified; retention + encryption enforced; restore drills performed quarterly.
- Secrets: stored in vault/secret manager; rotation calendar active; no secrets in git or container images.
- Access control: RBAC enforced for cluster and databases; least privilege for service accounts.
- Audit logging: gateway and policy decisions logged; access logs retained per compliance policy.
- Load test smoke: run `make k6` (or equivalent perf smoke) before major releases; ensure headroom before scaling down.

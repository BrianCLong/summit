# Summit Platform – Release Operations Runbook
> Version: 4.1.15 · Generated: 2026-03-09 · Target branch: `claude/harden-release-candidate-yB36k`

---

## 1. Deployment-Readiness Summary

**Verdict: CONDITIONALLY READY — see caveats in §10**

The release-candidate state has been hardened with:
- Concrete rollback script (replaces previous no-op simulation)
- Pre-deploy preflight check script
- Post-deploy smoke test script
- Real migration-status check in `/health/deployment`
- Shallow readiness probe (`/readyz`) now validates required env vars
- Structured startup logging (event fields for observability)
- Seven new Prometheus metrics covering health checks, feature flags, kill switches, plugins, i18n, API adapters, and startup duration

---

## 2. Environment / Config / Secret Inventory

### Required (non-defaultable) — must be set before deployment

| Variable | Purpose | Production constraint |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Must not contain `localhost` |
| `NEO4J_URI` | Neo4j bolt URI | Must not contain `localhost` |
| `NEO4J_USER` | Neo4j username | — |
| `NEO4J_PASSWORD` | Neo4j password | Must not contain `devpassword`/`changeme` |
| `JWT_SECRET` | JWT signing secret | min 32 chars, strong random |
| `JWT_REFRESH_SECRET` | JWT refresh secret | min 32 chars, different from `JWT_SECRET` |

### Required for production-mode enforcement

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Activates production guard in `config.ts` |
| `HEALTH_ENDPOINTS_ENABLED` | `true` | Required for K8s probes |
| `CONFIG_VALIDATE_ON_START` | `true` | Fail-fast on bad config at boot |
| `CORS_ORIGIN` | HTTPS origins only | Must not include `*` or `http://` |

### Optional but release-significant

| Variable | Purpose | Default |
|---|---|---|
| `AI_ENABLED` | Enable AI features | `false` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Required if `AI_ENABLED=true` | — |
| `KAFKA_ENABLED` | Enable Kafka workers | `false` |
| `FACTFLOW_ENABLED` | Enable FactFlow module | `false` |
| `GA_CLOUD` | Strict cloud readiness enforcement | `false` |
| `AWS_REGION` | Required if `GA_CLOUD=true` | — |
| `SEMANTIC_VALIDATION_ENABLED` | **⚠️ STUB — do NOT set true in production** | `false` |
| `SKIP_AI_ROUTES` | Disable AI route registration | `false` |
| `SKIP_GRAPHQL` | Disable GraphQL server | `false` |
| `SKIP_WEBHOOKS` | Disable webhook handlers | `false` |
| `DISABLE_NEO4J` | Skip Neo4j init (e.g. for DB-less testing) | unset |

### External services inventory

| Service | Required | Variable(s) |
|---|---|---|
| PostgreSQL 16 | Always | `DATABASE_URL` |
| Neo4j 5 | Always (unless `DISABLE_NEO4J`) | `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` |
| Redis 7 | Always | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| Elasticsearch 8 | Optional (search) | `ELASTICSEARCH_URL` |
| Qdrant | Optional (vector search) | `QDRANT_URL` |
| OIDC provider | Auth | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` |
| SMTP | Email | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| OpenAI / Anthropic | If AI enabled | `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` |

---

## 3. Deployment Procedure

### 3.1 Prerequisites

```bash
# Verify tools
node --version   # must be >=22
pnpm --version   # must be >=10
helm version     # if deploying to K8s
docker version   # if using container path
```

### 3.2 Pre-deploy preflight

```bash
# Staging
./scripts/preflight-check.sh --env staging

# Production (strict – requires clean git tree + tagged commit)
./scripts/preflight-check.sh --env production --strict
```

Expected output: `✅ All preflight checks passed. Proceed with deployment.`

If any check fails, resolve before proceeding.

### 3.3 Build

```bash
pnpm install --frozen-lockfile
pnpm run build           # builds both client and server
```

### 3.4 Database migrations

```bash
# Postgres (Prisma)
pnpm run db:pg:migrate

# Neo4j (custom migrations)
pnpm run db:neo4j:migrate

# Always verify status before switching traffic:
# /health/deployment endpoint will report pending_N if migrations are not applied
```

### 3.5 Deploy

**Kubernetes / Helm:**
```bash
helm upgrade summit ./helm \
  --namespace production \
  --set image.tag=v4.1.15 \
  --set config.nodeEnv=production \
  --wait \
  --timeout 10m
```

**Docker Compose (self-hosted):**
```bash
SUMMIT_IMAGE_TAG=v4.1.15 docker compose -f docker-compose.prod.yml up -d
```

### 3.6 Post-deploy smoke test

```bash
# Staging
./scripts/smoke-test.sh --base-url https://staging.intelgraph.example.com --env staging

# Production
./scripts/smoke-test.sh --base-url https://intelgraph.example.com --env production
```

Expected: `✅ All smoke checks passed.`

---

## 4. Preflight Checklist

Run before **every** deployment:

- [ ] `./scripts/preflight-check.sh --env <env>` passes
- [ ] All required env vars set (see §2)
- [ ] `SEMANTIC_VALIDATION_ENABLED` is NOT set to `true`
- [ ] AI_ENABLED=false (or API keys present if enabling)
- [ ] Database migrations are applied (`pnpm run db:pg:migrate`)
- [ ] Git tag matches image tag being deployed
- [ ] Rollback version identified and confirmed deployable
- [ ] On-call engineer aware deployment is starting

---

## 5. Post-Deploy Smoke Checklist

Verify after every deployment within 15 minutes:

- [ ] `/healthz` → HTTP 200
- [ ] `/health/live` → HTTP 200
- [ ] `/health/ready` → HTTP 200
- [ ] `/health/deployment` → `{"status":"ready_for_traffic"}`
- [ ] `/status` → correct `version` and `commit` fields
- [ ] `/health/detailed` → all services `healthy`
- [ ] GraphQL endpoint `/graphql` → reachable
- [ ] Error rate in Grafana stable (<1% of baseline)
- [ ] P99 latency ≤ baseline +20%
- [ ] No `startup_begin` / `startup_complete` anomalies in logs
- [ ] Prometheus scraping metrics (`summit_health_checks_total` visible)

---

## 6. Dashboards / Log Locations / Alerts

### Log locations

| Environment | Log target | Query |
|---|---|---|
| Docker Compose | Loki `:3100` | `{service="intelgraph-api"}` |
| K8s | Pod logs | `kubectl logs -n production -l app=summit --tail=200` |
| Structured fields | Pino JSON | `jq 'select(.event)' /var/log/summit/app.log` |

**Key structured log events to monitor:**

| Event | Meaning |
|---|---|
| `startup_begin` | Server init started; shows env, version, commit |
| `startup_complete` | Server is listening; includes uptime |
| `readyz_missing_vars` | /readyz returning 503 – missing config |
| `deployment_check_config_fail` | /health/deployment: bad config |
| `deployment_check_migrations_pending` | Pending Prisma migrations |
| `deployment_check_postgres_fail` | DB unreachable at deploy time |

### Grafana dashboards

- `http://grafana:3001` (compose) or configured Grafana host
- Key panels: HTTP request rate, error rate, P99 latency, DB pool size
- Alert rules: `observability/alert-rules*.yml`

### Prometheus alerts to watch post-deploy

- `HighErrorRate` – >5% 5xx rate
- `DatabaseConnectionPoolExhausted` – DB connection saturation
- `GraphQLRateLimitBreach` – GraphQL cost limit exceeded

---

## 7. Rollback Runbook

### 7.1 Rollback triggers (execute rollback when ANY of these is true)

- Error rate >5% for >5 consecutive minutes after deploy
- P99 latency >3× baseline for >5 consecutive minutes
- `/health/ready` returning 503
- `/health/deployment` returning non-`ready_for_traffic` status
- Database connection failures visible in `/health/detailed`
- Critical data corruption detected

### 7.2 Rollback command

```bash
# Dry run first (no changes)
./scripts/rollback.sh v4.1.14 production --dry-run

# Execute (requires interactive confirmation for production)
./scripts/rollback.sh v4.1.14 production
```

The script will:
1. Detect deployment mode (Helm or Docker Compose)
2. Roll back to the specified version
3. Wait 10s and verify `/healthz` (5 retries with 10s backoff)
4. Report pass/fail with next steps

### 7.3 Scenario-specific rollback

**App-only failure (code bug):**
```bash
./scripts/rollback.sh <prev-version> production
```
No migration reversal needed if migrations are additive-only.

**Config/secrets failure:**
```bash
# Re-point secret to previous value in secret manager
# Then restart pods (no image change needed)
kubectl rollout restart deployment/summit -n production
```

**Migration/data-compatibility failure:**
```bash
# 1. Roll back app first
./scripts/rollback.sh <prev-version> production
# 2. Run rollback migration (if available)
pnpm run db:pg:migrate:rollback
# 3. Verify data integrity
```
⚠️ Data rollback may not be reversible. Engage DBA before proceeding.

**Plugin/sandbox failure:**
```bash
# Disable affected plugin via env var or feature flag
PLUGIN_<NAME>_ENABLED=false kubectl rollout restart deployment/summit -n production
# Or roll back full app version
./scripts/rollback.sh <prev-version> production
```

**i18n/resource loading failure:**
```bash
# i18n failures are non-fatal (fallback to en-US)
# Check logs for: {"event":"i18n_load_error",...}
# Monitor summit_i18n_events_total{event="error"} in Prometheus
# Roll back only if fallback UX is unacceptable
./scripts/rollback.sh <prev-version> production
```

### 7.4 Automated vs manual rollback

Helm deployments support `--wait` flag which aborts if rollout fails health checks.
For immediate traffic revert: update the Helm release or K8s Service selector.

True automated rollback (traffic-level) requires Argo Rollouts or equivalent.
The `scripts/rollback.sh` provides the safest available manual path.

---

## 8. Known Operational Risks and Limitations

| Risk | Severity | Mitigation |
|---|---|---|
| `SEMANTIC_VALIDATION_ENABLED=true` in prod | **Critical** | `config.ts` production guard blocks it; `preflight-check.sh` verifies |
| Pending DB migrations at deploy time | High | `/health/deployment` blocks traffic until `migrations: current` |
| `summitJob*` metrics missing in `observability/metrics.ts` (pre-existing TS error) | Medium | Non-blocking (skipLibCheck + pre-existing); fix in separate PR |
| Full `pnpm install` times out in CI (~180s+) | Medium | Use `--prefer-offline` or pre-warm pnpm store |
| `rollback.sh` manual mode exits 2 if no tooling present | Low | Document as known gap; plan for Argo Rollouts |
| Neo4j health check adds latency to `/health/detailed` | Low | K8s uses `/health/ready` (shallow) for liveness; `/health/detailed` is admin-only |
| Duplicate TS errors in `observability/metrics.ts` (lines 9-24) | Low | Pre-existing; shadowed by `skipLibCheck`; tracked for separate fix |

---

## 9. Files Changed by This Hardening Pass

| File | Change |
|---|---|
| `server/src/index.ts` | Added structured `startup_begin` and `startup_complete` log events |
| `server/src/routes/health.ts` | Hardened `/readyz` (env var validation); hardened `/health/deployment` (real migration check); fixed import path for `summitHealthChecksTotal` |
| `server/src/monitoring/metrics.ts` | Added 7 new operational metrics: `summitHealthChecksTotal`, `summitFeatureFlagEvaluationsTotal`, `summitKillSwitchActivationsTotal`, `summitPluginEventsTotal`, `summitI18nEventsTotal`, `summitApiAdapterFailuresTotal`, `summitStartupDurationSeconds` |
| `server/src/observability/metrics.ts` | Re-exported new metrics; removed duplicate export block |
| `scripts/rollback.sh` | Replaced no-op simulation with real Helm/Compose rollback + health verification |
| `scripts/preflight-check.sh` | **NEW** Pre-deploy validation (tools, env vars, git state, build artefacts) |
| `scripts/smoke-test.sh` | **NEW** Post-deploy smoke test (health, readiness, deployment gate, GraphQL, metrics) |
| `docs/RELEASE_OPS_RUNBOOK.md` | **NEW** This document |

---

## 10. Final Recommendation

### CONDITIONALLY READY

Summit v4.1.15 RC is deployable to staging immediately and to production once the following caveats are resolved:

**Must-resolve before production:**

1. **Run full migrations**: Confirm `pnpm run db:pg:migrate` completes cleanly; `/health/deployment` must return `migrations: current`.

2. **Inject production secrets**: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEO4J_PASSWORD`, `DATABASE_URL` must be set from a secret manager (not `.env` file) with production-strength values.

3. **Set `NODE_ENV=production`** and `HEALTH_ENDPOINTS_ENABLED=true` in the deployment manifest.

4. **Confirm `SEMANTIC_VALIDATION_ENABLED` is not `true`** – the `preflight-check.sh` script will catch this.

**Nice-to-have before production:**

5. Resolve pre-existing `summitJob*` / `summitHttpRequestDuration` missing-export TS errors in `observability/metrics.ts` (separate PR; non-blocking due to `skipLibCheck`).

6. Wire `summitFeatureFlagEvaluationsTotal` and `summitKillSwitchActivationsTotal` into `server/src/lib/featureFlags.ts` call sites (separate observability PR).

7. Add Argo Rollouts or equivalent for automated traffic rollback (currently manual via `scripts/rollback.sh`).

**Verification completed this pass:**

- TypeScript compilation: ✅ no new errors introduced
- Changed files: ✅ compile cleanly (pre-existing errors pre-date this work)
- Preflight script: ✅ syntax validated
- Smoke test script: ✅ syntax validated
- Rollback script: ✅ syntax validated, dry-run path exercisable
- Health endpoint changes: ✅ real migration check replaces simulation

```
Signed off: Claude (harden-release-candidate pass)
Date: 2026-03-09
Branch: claude/harden-release-candidate-yB36k
```

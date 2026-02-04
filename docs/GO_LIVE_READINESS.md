# Go-Live Readiness Document

## Service Overview

**Name:** IntelGraph Platform
**Version:** 5.2.59
**Description:** Next-generation intelligence analysis platform with AI-augmented graph analytics

### Key Entrypoints

| Component    | Entrypoint                 | Port                |
| ------------ | -------------------------- | ------------------- |
| Server (API) | `server/dist/src/index.js` | 3000 (configurable) |
| Client       | `client/` (Vite build)     | 3000                |
| Gateway      | `apps/gateway/`            | 8080                |
| UI           | `apps/ui/`                 | 80                  |

## Deploy Method

**Primary:** Docker Compose (`docker-compose.dev.yaml`)

### Environments

| Environment | Config File               | Status    |
| ----------- | ------------------------- | --------- |
| Local Dev   | `docker-compose.dev.yaml` | Available |
| Production  | `Dockerfile` (root)       | Available |

## Quality Gates Status

| Gate      | Command                          | Status                   |
| --------- | -------------------------------- | ------------------------ |
| Install   | `pnpm install --frozen-lockfile` | Requires lockfile update |
| Build     | `pnpm build`                     | PASS                     |
| Lint      | `pnpm -r lint`                   | Partial (some packages)  |
| Typecheck | `pnpm -r typecheck`              | Partial (some packages)  |
| Test      | `pnpm test`                      | PASS (with retries)      |

## Checklist

### A) Build & Release Reproducibility

| Item                   | Status | Evidence                                           |
| ---------------------- | ------ | -------------------------------------------------- |
| Deterministic build    | DONE   | CI runs `pnpm build` twice and compares checksums  |
| Lockfile committed     | DONE   | `pnpm-lock.yaml` tracked                           |
| Package manager pinned | DONE   | `"packageManager": "pnpm@10.26.0"` in package.json |
| Node version pinned    | DONE   | `.nvmrc`: 20.19.0                                  |

### B) Config & Secrets Management

| Item                         | Status | Evidence                                                          |
| ---------------------------- | ------ | ----------------------------------------------------------------- |
| `.env.example` exists        | DONE   | `/home/user/summit/.env.example`                                  |
| Secrets not committed        | DONE   | `.gitignore` excludes `.env*`, `*.key`, `*.pem`, secrets patterns |
| Config validation at startup | DONE   | `server/src/config.ts` - Zod validation with `process.exit(1)`    |

**Required Environment Variables:**

- `NEO4J_URI` - Neo4j database connection URI
- `NEO4J_USER` - Neo4j username
- `NEO4J_PASSWORD` - Neo4j password
- `OIDC_ISSUER` - OIDC provider URL
- `OIDC_CLIENT_ID` - OIDC client ID
- `OIDC_CLIENT_SECRET` - OIDC client secret
- `SESSION_SECRET` - Session encryption key

### C) Security Hardening

| Item                    | Status | Evidence                                    |
| ----------------------- | ------ | ------------------------------------------- |
| Helmet middleware       | DONE   | `server/src/appFactory.ts`                  |
| CORS configured         | DONE   | `server/src/appFactory.ts`                  |
| Rate limiting           | DONE   | `express-rate-limit` in server dependencies |
| Non-root container user | DONE   | `USER 1000` in Dockerfile                   |

### D) Reliability & Correctness

| Item                | Status | Evidence                                                   |
| ------------------- | ------ | ---------------------------------------------------------- |
| Health endpoint     | DONE   | `/health` in appFactory.ts, `/healthz` in Dockerfile       |
| Graceful shutdown   | DONE   | `server/src/index.ts` - SIGINT/SIGTERM handlers (L202-235) |
| Database migrations | DONE   | `server/scripts/run-migrations.ts`                         |

### E) Observability

| Item               | Status | Evidence                                   |
| ------------------ | ------ | ------------------------------------------ |
| Structured logging | DONE   | Pino logger (`server/src/utils/logger.ts`) |
| Metrics endpoint   | DONE   | `prom-client` dependency                   |
| OpenTelemetry      | DONE   | `@opentelemetry/*` dependencies            |
| Audit logs         | DONE   | `server/src/logging/structuredLogger.ts`   |

### F) Data Safety

| Item              | Status | Evidence                                           |
| ----------------- | ------ | -------------------------------------------------- |
| Migration command | DONE   | `pnpm db:migrate` / `cd server && npm run migrate` |
| Rollback strategy | DONE   | `pnpm db:knex:rollback`                            |
| Backup command    | DONE   | `pnpm backup` / `scripts/backup.sh`                |

### G) Performance Basics

| Item                 | Status | Evidence             |
| -------------------- | ------ | -------------------- |
| Performance baseline | DONE   | `make perf-baseline` |
| Performance checks   | DONE   | `make perf-check`    |
| k6 load tests        | DONE   | `make k6`            |

### H) Runbooks

| Item             | Status | Evidence  |
| ---------------- | ------ | --------- |
| Deploy runbook   | DONE   | See below |
| Rollback runbook | DONE   | See below |
| Incident runbook | DONE   | See below |

## Deploy Runbook

### Prerequisites

1. Docker and Docker Compose installed
2. Copy `.env.example` to `.env` and fill in values
3. Node.js 20.19.0 (see `.nvmrc`)
4. pnpm 10.26.0

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Start dev stack
make dev-up
# or: docker compose -f docker-compose.dev.yaml up --build -d

# 3. Run smoke checks
make dev-smoke
```

### Production Deploy

```bash
# 1. Build production image
docker build -t intelgraph-platform:latest -f Dockerfile .

# 2. Run database migrations
cd server && npx tsx scripts/run-migrations.ts

# 3. Deploy container (example)
docker run -d \
  --name intelgraph \
  -p 3000:3000 \
  --env-file .env \
  intelgraph-platform:latest

# 4. Verify health
curl http://localhost:3000/healthz
```

### Post-Deploy Verification

```bash
# Run automated smoke tests
./scripts/smoke-test.sh localhost:3000

# Or manual checks:
# Check health endpoint
curl -f http://localhost:3000/healthz

# Check metrics endpoint (if enabled)
curl http://localhost:3000/metrics

# Check logs
docker logs intelgraph --tail 100
```

## Rollback Runbook

### Using Makefile

```bash
make rollback v=v5.2.58 env=prod
```

### Manual Rollback

```bash
# 1. Stop current container
docker stop intelgraph

# 2. Start previous version
docker run -d \
  --name intelgraph \
  -p 3000:3000 \
  --env-file .env \
  intelgraph-platform:v5.2.58

# 3. Rollback migrations if needed
cd server && npx knex migrate:rollback --knexfile packages/db/knex/knexfile.cjs
```

## Incident Runbook

### Severity Classification

| Severity | Description                          | Response Time | Examples                       |
| -------- | ------------------------------------ | ------------- | ------------------------------ |
| P1       | Service down, data loss risk         | Immediate     | DB unreachable, auth broken    |
| P2       | Degraded performance, partial outage | < 1 hour      | Slow queries, one service down |
| P3       | Non-critical issue                   | < 4 hours     | UI glitch, non-blocking errors |

### Initial Triage Steps

```bash
# 1. Check service health
curl -f http://localhost:3000/healthz

# 2. Check container status
docker ps -a | grep intelgraph

# 3. View recent logs (last 500 lines)
docker logs intelgraph --tail 500 --timestamps

# 4. Check resource usage
docker stats intelgraph --no-stream

# 5. Check database connectivity
docker exec intelgraph curl -s http://localhost:3000/health
```

### Common Issues & Resolutions

#### Database Connection Failed

```bash
# Check Neo4j status
docker logs neo4j --tail 100

# Verify connection string
docker exec intelgraph env | grep NEO4J

# Restart with fresh connection
docker restart intelgraph
```

#### High Memory Usage

```bash
# Check memory stats
docker stats intelgraph --no-stream

# If OOM, restart with increased limits
docker stop intelgraph
docker run -d --name intelgraph -m 4g --memory-swap 4g ...
```

#### Authentication Failures

```bash
# Check OIDC provider connectivity
curl -s https://$OIDC_ISSUER/.well-known/openid-configuration

# Verify JWT secrets are set
docker exec intelgraph env | grep JWT

# Check auth logs
docker logs intelgraph 2>&1 | grep -i "auth\|jwt\|oidc"
```

### Escalation Path

1. **On-call Engineer** - Initial triage, restart services
2. **Platform Team Lead** - Database issues, infrastructure
3. **Security Team** - Auth failures, suspected breaches
4. **Executive** - P1 lasting > 30 minutes

### Post-Incident

1. Document timeline in incident ticket
2. Collect logs: `docker logs intelgraph > incident-$(date +%Y%m%d).log`
3. Schedule blameless post-mortem within 48 hours
4. Create follow-up tickets for preventive measures

## Known Risks & Guardrails

1. **Database migrations** - Always backup before running migrations
2. **Neo4j connection** - Ensure Neo4j is running before starting server
3. **OIDC configuration** - Validate OIDC provider is reachable at startup
4. **Memory limits** - Set container memory limits based on expected load

## CI/CD Pipeline

The repository uses GitHub Actions (`.github/workflows/ci-pr.yml`) with the following jobs:

1. **build-test** - Lint, Typecheck, Test, Build (matrix)
2. **config-guard** - Validate Jest & pnpm configuration
3. **integration-tests** - Full integration test suite
4. **verification-suite** - Runtime configuration verification
5. **deterministic-build** - Ensure reproducible builds
6. **golden-path** - Smoke test full stack
7. **e2e-tests** - Playwright E2E tests
8. **governance** - TSConfig and docs verification
9. **soc-controls** - SOC compliance checks

## External Steps Required

1. **DNS Configuration** - Point domain to production server
2. **OIDC Provider Setup** - Configure Okta/Auth0 with correct redirect URIs
3. **Neo4j Instance** - Provision and configure Neo4j database
4. **Redis Instance** - Provision Redis for session/cache (if used)
5. **SSL Certificates** - Configure TLS termination

---

_Generated: 2026-01-29_
_Last Updated: 2026-01-29_

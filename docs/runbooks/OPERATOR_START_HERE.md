# Summit — Operator & Reviewer Start Here

This is the canonical entry point for operators managing GA deployments and
reviewers working with the Summit codebase. Start here before any other doc.

---

## What Is Summit?

Summit is the IntelGraph intelligence platform. Its critical operational surfaces are:
- **API server** (Node.js, port 4000) — GraphQL + REST
- **Databases**: PostgreSQL, Neo4j, Redis
- **Evidence pipeline**: provenance, governance, policy enforcement (OPA)
- **Observability**: OTEL, Prometheus, Grafana, Jaeger

---

## I Need To...

### Deploy a new GA release

1. Create GA tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z" && git push origin vX.Y.Z`
2. This triggers **`release-ga-pipeline.yml`** — the canonical pipeline.
3. Monitor in GitHub Actions. Pipeline stages: Gate → Freeze → Lineage → Verify → Build → Publish Guard → Assemble → **Approval** → Publish.
4. The `ga-release` environment requires two-person approval before publish.
5. After publish, run post-deploy validation (see below).

**Full deploy reference**: `GO_LIVE_READINESS.md`

---

### Validate after deployment

```bash
# Quick health check
curl -sf https://<your-domain>/healthz && echo "LIVE"

# Full smoke test
BASE_URL=https://<your-domain> ./scripts/go-live/smoke-prod.sh

# Post-deploy canary (with evidence)
gh workflow run post-deploy-gate.yml -f base_url=https://<your-domain>
```

**Full validation reference**: `docs/runbooks/POST_DEPLOY_VALIDATION.md`

---

### Roll back a bad release

```bash
# Dry-run first
gh workflow run release-rollback.yml \
  -f tag=vX.Y.Z \
  -f reason="Dry-run validation" \
  -f dry_run=true

# Execute rollback (requires hotfix-release env approval)
gh workflow run release-rollback.yml \
  -f tag=vX.Y.Z \
  -f reason="<reason for rollback, min 18 chars>" \
  -f create_issue=true
```

**Full rollback reference**: `rollback-plan.md`

---

### Understand the release pipeline

| Step | Workflow / Script |
|------|-------------------|
| RC prep | `release-rc.yml`, `rc-preparation.yml` |
| GA release | `.github/workflows/release-ga-pipeline.yml` |
| Emergency dispatch | `.github/workflows/release-ga.yml` (dispatch-only) |
| Rollback | `.github/workflows/release-rollback.yml` |
| Post-deploy gate | `.github/workflows/post-deploy-gate.yml` |
| Smoke gate | `.github/workflows/smoke-gate.yml` |

---

### Respond to an incident

1. Assess severity using alert thresholds in `docs/runbooks/GA_RUNBOOK.md`
2. P1 (error rate > 2%, data corruption, security breach): rollback immediately
3. P2 (latency, degraded): canary freeze + investigation
4. Follow: `docs/runbooks/INCIDENT_RESPONSE.md`
5. Escalation matrix: `docs/runbooks/GA_ESCALATION_MATRIX.md`

---

## Key Files for Reviewers

| Question | File |
|----------|------|
| What does the deploy look like? | `GO_LIVE_READINESS.md` |
| How is rollback done? | `rollback-plan.md` |
| What's the GA pipeline? | `.github/workflows/release-ga-pipeline.yml` |
| Post-deploy validation flow | `docs/runbooks/POST_DEPLOY_VALIDATION.md` |
| Launch operator checklist | `LAUNCH_OPERATOR_CHECKLIST.md` |
| Evidence artifact model | `README.evidence-pack.md` |
| Evidence schema | `docs/evidence/schema/` |
| Governance/policy | `docs/runbooks/CI_RELEASE_GATE_RUNBOOK.md` |
| Deployment architecture | `docs/runbooks/DEPLOYMENT_RUNBOOK.md` |
| DB migrations rollback | `docs/runbooks/migrations-rollback.md` |
| Canary rollback | `docs/runbooks/ROLLBACK.md` |
| Deploy readiness audit | `artifacts/reports/deploy-readiness-report.md` |
| Rollback readiness audit | `artifacts/reports/rollback-readiness-report.md` |
| All runbooks index | `docs/runbooks/README.md` |

---

## Health Endpoints Quick Reference

| Endpoint | Purpose |
|----------|---------|
| `GET /healthz` | Liveness probe |
| `GET /readyz` | Readiness probe |
| `GET /health` | Application health (JSON) |
| `GET /metrics` | Prometheus metrics |
| `GET /api/health/db` | Database connectivity |

---

## Environment Variables (Critical)

Verify these before any deploy:
- `NODE_ENV=production`
- `ENABLE_INSECURE_DEV_AUTH=false`
- `DATABASE_URL`, `NEO4J_URI`, `REDIS_URL` — all pointing to production
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET` — secure random strings
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` — production IdP

Full list: `GO_LIVE_READINESS.md` Section 2.

---

## Rollback Decision Criteria

| Signal | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 2% for 10m | Rollback |
| API p95 latency | > 2s for 10m | Rollback |
| Data corruption | Any | Rollback |
| Security breach | Any | Rollback |
| Canary SLO breach | Error >1% or latency >1s (2 intervals) | Freeze + rollback |

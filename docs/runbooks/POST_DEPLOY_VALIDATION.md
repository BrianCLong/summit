# Post-Deploy Validation Runbook

**Canonical workflow**: `.github/workflows/post-deploy-gate.yml`
**Operator checklist**: `LAUNCH_OPERATOR_CHECKLIST.md`

---

## When to Run This

Run post-deploy validation immediately after every GA deployment, before enabling
full external traffic. The window is typically **T+0 to T+15 minutes**.

---

## Phase 1 — Readiness Check (automated)

The smoke gate workflow runs on every PR and push to main/release branches:

```bash
# Trigger manually if needed:
gh workflow run smoke-gate.yml
```

Or against a live deployment:

```bash
BASE_URL=https://<your-domain> ./scripts/go-live/smoke-prod.sh
```

**What it checks:**

| Endpoint | Expected |
|----------|----------|
| `GET /healthz` | HTTP 200 |
| `GET /readyz` | HTTP 200 |
| `GET /health` | HTTP 200, `{"status":"ok"}` |
| `GET /metrics` | HTTP 200, Prometheus format |

---

## Phase 2 — Post-Deploy Canary (automated)

Trigger the full post-deploy gate workflow:

```bash
gh workflow run post-deploy-gate.yml \
  -f base_url=https://<your-domain> \
  -f prom_url=https://<prometheus-url> \
  -f require_prom=false
```

Or run the canary script directly:

```bash
BASE_URL=https://<your-domain> bash scripts/go-live/post-deploy-canary.sh
```

Evidence is written to: `artifacts/evidence/post-deploy/<sha>/canary.json`

Verify the evidence bundle:

```bash
pnpm evidence:post-deploy:verify
```

---

## Phase 3 — SLO Snapshot (if Prometheus is available)

```bash
PROM_URL=https://<prometheus-url> npx tsx scripts/go-live/prom-slo-snapshot.ts
```

**Key SLOs to confirm:**

| SLO | Target | Threshold |
|-----|--------|-----------|
| HTTP p95 latency | < 200ms | Alert at 1s |
| Error rate | < 1% | Alert at 2% |
| Kafka end-to-end | < 2s p95 | Alert at 5s |

---

## Phase 4 — Regression Detection (T+1h)

```bash
node scripts/detect-ga-regressions.mjs
```

---

## Phase 5 — First-Day Stabilization (T+24h)

```bash
node scripts/ga-feedback-aggregator.mjs
```

Check:
- Audit trail: `curl https://<your-domain>/api/compliance/verify`
- FinOps dashboard for token burn
- Error rate trend in Grafana

---

## Key Operational Signals

| Signal | Where to Look | Alert Threshold |
|--------|---------------|-----------------|
| Error rate | Grafana → Production SLO Dashboard | > 2% × 10m |
| p95 latency | Grafana → Production SLO Dashboard | > 2s × 10m |
| Ingest queue depth | Grafana → Maestro Dashboard | See `slo-config.yaml` |
| NLU accuracy | Spot-check first 10 user queries | Any systematic failure |
| Evidence queue | Grafana → Maestro Dashboard | Backlog > 1000 |

---

## If Checks Fail

| Result | Action |
|--------|--------|
| `/healthz` or `/readyz` fails | Do NOT enable traffic. Follow `rollback-plan.md` |
| Error rate > 2% after 10m | Trigger rollback via `release-rollback.yml` |
| SLO snapshot shows breach | Freeze traffic, investigate, consider rollback |
| Canary evidence shows failures | Hold traffic at canary level, escalate |

See `rollback-plan.md` for the full rollback procedure.

---

## Evidence Artifact

After a successful post-deploy validation, the CI workflow uploads:

- **Artifact name**: `post-deploy-evidence-<sha>`
- **Retention**: 90 days
- **Location**: GitHub Actions → `post-deploy-gate` workflow run → Artifacts

---

## Telemetry Coverage Map

| Critical Path | Validated By |
|---------------|-------------|
| API health | `smoke-prod.sh`, canary health checks |
| DB connectivity | `GET /api/health/db`, smoke test |
| GraphQL layer | `smoke-test.js` (GraphQL introspection) |
| Auth | DVT `GET /api/v1/user/me` |
| Ingest pipeline | Evidence queue monitoring |
| Observability | OTEL collector → Jaeger, Prometheus → Grafana |
| Policy / OPA | `GET /health` on OPA port |

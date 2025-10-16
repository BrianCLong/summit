````markdown
---
slug: sprint-2026-01-05-hotel
version: v2026.01.05-h1
cycle: Sprint 30 (2 weeks)
start_date: 2026-01-05
end_date: 2026-01-16
owner: Release Captain (you)
parent_slug: sprint-2025-12-08-golf
roles:
  - DevOps/Platform Engineer
  - CI/CD Engineer
  - Deployment Engineer
  - Security & Governance Engineer
  - Data/Compliance Engineer
  - Observability Engineer
  - FinOps Lead
  - Repo Maintainer / Arborist
objectives:
  - 'Post-freeze restart: safely thaw with staged promotions and backlog triage.'
  - 'Kubernetes minor upgrade + node OS patch baseline with surge rolling and pod disruption budgets.'
  - 'Database lifecycle: extension patching, vacuum policy tuning, and connection pooling improvements.'
  - 'Dependency refresh: framework/LTS upgrades with SBOM deltas and runtime perf sanity.'
  - 'Feature-flag hygiene: archive stale flags, document permanent guards, and clean dead code.'
  - 'SLO reset: confirm targets, re-tune burn alerts, and publish 2026 reliability plan.'
---

# Sprint 30 Plan — Safe Thaw, Platform Upgrades, and 2026 SLO Reset

Assumes Sprint 29 freeze ended **2026-01-03** with hotfix-only changes. This sprint re-warms delivery, upgrades the platform safely, cleans technical debt (deps & flags), and re-baselines SLOs for 2026.

---

## 0) Definition of Ready (DoR)

- [ ] Thaw checklist acknowledged; prod change window re-opened with canaries.
- [ ] Cluster upgrade plan with target versions, surge strategy, and rollback path documented.
- [ ] DB maintenance window approved; backups current; PITR validated.
- [ ] Dep upgrade inventory (risk ranking, test coverage) compiled.
- [ ] Flag catalog exported with usage metrics and owners.
- [ ] 2026 SLO draft per service circulated for sign-off.

---

## 1) Swimlanes

### A. Thaw & Promotions (Release/Deploy)

1. **Staged thaw**: dev→stage→prod with stricter gates first week; daily go/no-go standup.
2. **Canary defaults**: 10→30→60→100 with burn-rate guards; auto-rollback armed.

### B. Kubernetes & Node OS Upgrade (Platform)

1. **Minor K8s bump** (e.g., n→n+1) using **surge rolling**; validate CRDs & webhooks.
2. **PDBs** validated; eviction tests; cordon→drain automation.
3. **Node OS** patches & base images refresh; image rebuilds with SBOM delta reports.

### C. Database Lifecycle (Data/Platform)

1. **Extension patching** (pgcrypto, plv8 if used); **autovacuum** tuning per table hotness.
2. **Connection pooling**: PgBouncer/connection reuse; async I/O checks.
3. **Index health**: bloat check, missing/unused index report.

### D. Dependency Refresh (CI/CD)

1. **Framework/LTS upgrades** (Node LTS, Python, Go) and libs with changelog diffs.
2. **Runtime perf sanity** via k6 smoke + p95/p99 compare.
3. **SBOM delta**: new deps scanned; license drift alerting.

### E. Feature-Flag Hygiene (Platform/Arborist)

1. **Flag audit**: stale/off-by-default flags removed; permanent guards documented.
2. **Dead code** removal PRs guarded by coverage.

### F. SLO Reset & Observability (Obs/SRE)

1. **2026 SLOs**: targets & owners; burn alerts tuned; annotation of policy version.
2. **Golden dashboards** refreshed; latency buckets aligned; RED + saturation panels.

---

## 2) Measurable Goals

- All prod clusters upgraded n→n+1 with **zero customer-visible downtime**; rollback tested on stage.
- Node base images rebuilt & signed; SBOM delta shows **0 CRITICAL** vulns introduced.
- p95 for top endpoints **unchanged or improved** during upgrades; error rate ≤ baseline.
- DB: autovacuum tuned; index bloat reduced by **≥20%** on targeted tables; pool hit ratio ≥ **0.9**.
- ≥ 90% of **stale flags** removed or archived; dead code PRs merged for 3 targets.
- **SLO v2026** published, alerts firing in test, and on-call rotation confirmed.

---

## 3) Risk Register

| Risk                                          | Prob | Impact | Mitigation                                                              | Owner    |
| --------------------------------------------- | ---: | -----: | ----------------------------------------------------------------------- | -------- |
| Webhook/CRD incompatibilities on K8s bump     |    M |      H | Stage rehearsal, conversion webhooks dry-run, surge rollout             | Platform |
| Autovacuum tuning causes bloat/latency spikes |    M |      M | Per-table thresholds, monitor `pg_stat_activity` & `pg_stat_all_tables` | Data     |
| Dep upgrades introduce subtle runtime changes |    M |      M | Contract tests + e2e smoke + perf compare                               | CI/CD    |
| Flag cleanup removes needed guard             |    L |      M | Archive first; feature-toggle kill switch retained                      | Platform |

---

## 4) Backlog (Sprint-Scoped)

### EPIC-UP: K8s/OS Upgrade

- [ ] K8S-3001 — Cluster version bump plan, surge config, rollback
- [ ] K8S-3002 — PDB validation + eviction drill
- [ ] K8S-3003 — Base image refresh & SBOM delta scan

### EPIC-DB: Database Lifecycle

- [ ] DB-3101 — Extension patch set + smoke
- [ ] DB-3102 — Autovacuum per-table tuning (fillfactor, thresholds)
- [ ] DB-3103 — Connection pooling & max_conns review; PgBouncer tune
- [ ] DB-3104 — Index bloat check & cleanup

### EPIC-DEP: Dependency Refresh

- [ ] DEP-3201 — Node LTS + toolchain updates
- [ ] DEP-3202 — Library upgrades with changelog review
- [ ] DEP-3203 — SBOM delta + license check

### EPIC-FLG: Feature Flags

- [ ] FLG-3301 — Export flag catalog + usage
- [ ] FLG-3302 — Remove stale/off-by-default flags
- [ ] FLG-3303 — Dead code deletion PRs (3 services)

### EPIC-SLO: 2026 Reset

- [ ] SLO-3401 — Define targets & owners; commit `slo/2026/*.yaml`
- [ ] SLO-3402 — Burn alerts tuning & test fire
- [ ] SLO-3403 — Dashboard refresh + annotation

### EPIC-THAW: Promotions

- [ ] THAW-3501 — Thaw checklist & comms
- [ ] THAW-3502 — First-week stricter gates; daily go/no-go

---

## 5) Scaffolds & Snippets

### 5.1 K8s Surge Rolling & PDBs (Helm values excerpt)

**Path:** `charts/app/values-upgrade.yaml`

```yaml
updateStrategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 2
pdb:
  enabled: true
  minAvailable: 80%
```
````

### 5.2 Node Base Image Refresh (CI)

**Path:** `.github/workflows/base-image-refresh.yml`

```yaml
name: base-image-refresh
on: [workflow_dispatch]
jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: docker build --no-cache -t $REG/base:${{ github.sha }} -f Dockerfile.base .
      - name: SBOM + scan
        run: |
          syft $REG/base:${{ github.sha }} -o spdx-json > sbom.json
          trivy image --severity HIGH,CRITICAL $REG/base:${{ github.sha }}
```

### 5.3 DB Autovacuum Tuning (SQL template)

**Path:** `ops/db/autovacuum.sql`

```sql
ALTER TABLE public.events SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_limit = 2000
);
```

### 5.4 PgBouncer Tune (ini)

**Path:** `ops/db/pgbouncer.ini`

```ini
pool_mode=transaction
max_client_conn=2000
default_pool_size=50
server_idle_timeout=60
ignore_startup_parameters=extra_float_digits
```

### 5.5 Index Bloat Check (SQL)

**Path:** `ops/db/index_bloat.sql`

```sql
-- requires pgstattuple
SELECT relname, round((1 - (pgstatindex(indexrelid)).avg_leaf_density/100)::numeric,3) AS bloat
FROM pg_index JOIN pg_class ON pg_class.oid = pg_index.indexrelid
ORDER BY bloat DESC LIMIT 20;
```

### 5.6 Dep Upgrade Gate (CI)

**Path:** `.github/workflows/dep-upgrade.yml`

```yaml
name: deps-upgrade
on: [pull_request]
jobs:
  test-perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm i --frozen-lockfile
      - run: pnpm test
      - name: k6 smoke perf compare
        run: node tools/compare-perf.js # compare p95 before/after
```

### 5.7 Flag Catalog Exporter

**Path:** `tools/flags/export.ts`

```ts
import fs from 'fs';
// Walk codebase for flag keys, read from flag svc, output usage metrics
fs.writeFileSync(
  'flags/catalog.json',
  JSON.stringify(
    {
      /* ... */
    },
    null,
    2,
  ),
);
```

### 5.8 SLO-as-Code (2026)

**Path:** `slo/2026/catalog.yaml`

```yaml
services:
  gateway: { latency_p95_ms: 1200, availability: 99.9 }
  docs-api: { latency_p95_ms: 1200, availability: 99.9 }
  ingest: { latency_p95_ms: 1200, availability: 99.9 }
policy_version: 2026.01
```

### 5.9 Burn Alert Tuning (PrometheusRule)

**Path:** `charts/monitoring/templates/burn-2026.yaml`

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata: { name: burn-2026 }
spec:
  groups:
    - name: burn.rules
      rules:
        - alert: FastBurn
          expr: error_rate_5m > 0.02
          for: 2m
          labels: { severity: page, policy: '2026.01' }
        - alert: SlowBurn
          expr: error_rate_1h > 0.01
          for: 15m
          labels: { severity: warn, policy: '2026.01' }
```

### 5.10 Thaw Checklist (pin this)

**Path:** `checklists/thaw.md`

```md
- [ ] Canary guards armed; rollback tested on stage
- [ ] PDBs validated; eviction test run
- [ ] Backups recent; DR recovery tested in last 30 days
- [ ] SBOM delta reports reviewed
- [ ] SLO dashboard green; alerts wired
```

---

## 6) Observability & Alerts

- **Dashboards**: upgrade progress (nodes by version), p95 trend during rollout, DB vacuum activity, pool hit ratio, SBOM delta summary, flag churn.
- **Alerts**: admission/webhook errors spike, pod eviction failures, autovacuum lag, pool saturation, perf regression (p95 ↑ >10%).

---

## 7) Promotions & Gates

| Stage | Preconditions             | Action                                                   | Verification                     | Rollback                        |
| ----- | ------------------------- | -------------------------------------------------------- | -------------------------------- | ------------------------------- |
| dev   | Upgrade plan; tests green | Upgrade control plane/workers; run smoke                 | Pods healthy; webhooks ok        | K8s rollback or pin nodes       |
| stage | Dev stable 24h            | Surge roll nodes; run perf compare; DB tuning on replica | p95 not worse; errors ≤ baseline | Revert tuning; drain back       |
| prod  | Stage soak 48h            | Gradual node pool replacement; DB changes in window      | SLOs green; audit captured       | Pause/rollback pool; revert SQL |

---

## 8) Acceptance Evidence

- K8s versions before/after; successful surge with zero downtime.
- SBOM delta and Trivy scans with 0 CRITICAL.
- Perf compare report: p95 stable/improved; error rate steady.
- DB metrics: bloat ↓ ≥20%, pool hit ratio ≥0.9; autovacuum activity normal.
- Flag catalog and merged cleanup PRs; archived flags list.
- SLO 2026 catalog merged; burn alerts demonstrated in test.

---

## 9) Calendar & Ownership

- **Week 1**: Thaw + dev/stage upgrades, dep inventory, flag export, SLO draft.
- **Week 2**: Prod rollout, DB tuning, dep upgrades, flag cleanup, SLO publish, release cut.

Release cut: **2026-01-16 (Fri)**; normal cadence resumes.

---

## 10) Issue Seeds

- K8S-3001/3002/3003, DB-3101/3102/3103/3104, DEP-3201/3202/3203, FLG-3301/3302/3303, SLO-3401/3402/3403, THAW-3501/3502

---

_End of Sprint 30 plan._

```

```

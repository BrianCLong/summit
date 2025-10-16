````markdown
---
slug: sprint-2026-03-30-november
version: v2026.03.30-n1
cycle: Sprint 36 (2 weeks)
start_date: 2026-03-30
end_date: 2026-04-10
owner: Release Captain (you)
parent_slug: sprint-2026-03-16-mike
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
  - 'Data scale-out: partitioning/sharding plan v1 (tenant-hash) with zero-downtime cutover for one hot table.'
  - 'Reliability: backup validation pipeline (automated restore + checksums) and quarterly DR report generator.'
  - 'Observability v5: tail-based sampling, adaptive alerts, and SLO gap analysis with suggested remediations.'
  - 'Search & ingest quality: relevance/recall tuning with canary metrics; schema index strategy codified.'
  - 'Access governance: purpose-based access (PBA) prompts + immutable evidence for sensitive queries.'
  - 'FinOps v5: predictive autoscaling (load forecast), savings-plan coverage report, and idle asset janitor v2.'
---

# Sprint 36 Plan — Scale-Out Data, Verified Backups, and Adaptive Observability

Builds on Sprint 35 (ABAC, release train, contracts, p99.9). We prepare for growth with **partitioning/sharding**, prove **backups actually restore**, add **tail-based sampling & adaptive alerts**, tune **search/ingest quality**, and advance **purpose-based access** & **FinOps forecasting**.

---

## 0) Definition of Ready (DoR)

- [ ] Hot table identified with access patterns & growth; shard/partition key agreed (tenant_id, created_at).
- [ ] Restore S3/Object-lock bucket & non-prod target cluster available for validation job.
- [ ] Sampling & alert policies drafted (tail-sampling ratios; alert rules by SLO gap).
- [ ] Search quality KPIs chosen (ERR@k, NDCG proxy, recall on fixtures) with canary plan.
- [ ] PBA prompts (who/what/why/when) text reviewed by security & legal.
- [ ] Forecast inputs (RPS, cron bursts, seasonality) wired for predictive autoscaling PoC.

---

## 1) Swimlanes

### A. Data Scale-Out (Platform/Data)

1. **Partitioning**: time+tenant partitions with trigger-based routing; foreign tables off if used.
2. **Sharding Plan v1**: tenant-hash map & router; read-your-writes consistency guarantees.
3. **Zero-downtime cutover**: dual-write (old+new), backfill job with throttling, contract checks.

### B. Verified Backups & DR Evidence (SRE/Data)

1. **Automated restore** pipeline: nightly PITR restore to stage-like; checksum tables & row counts.
2. **Quarterly DR report** generator with RTO/RPO evidence artifacts.

### C. Observability v5 (Obs)

1. **Tail-based sampling** (OTel collector) to keep critical traces; exemplars wired.
2. **Adaptive alerts**: alert only when SLO gap > budget burn threshold; suppress flaps.
3. **SLO gap analysis** bot that suggests top offenders and runbooks.

### D. Search & Ingest Quality (Backend/Platform)

1. **Relevance canary**: shadow evaluate queries; measure ERR@k/recall.
2. **Index strategy**: partial indexes, covering indexes; VACUUM/ANALYZE cadence.

### E. Purpose-Based Access (Security/Data)

1. **PBA prompts**: require reason-for-access; bind to ticket/authority.
2. **Evidence**: write to immutable audit with retention & policy tags.

### F. FinOps v5 (FinOps/Platform)

1. **Predictive autoscaling**: forecast RPS → set HPA min replicas before surge.
2. **Savings-plan coverage** & rightsizing report.
3. **Idle janitor v2**: detect idle LBs, unattached disks, stale snapshots; auto-PR deletes.

### G. Repo Arborist

- ADRs: partitioning/sharding, sampling policy, PBA; CODEOWNERS for `ops/restore/**`.

---

## 2) Measurable Goals

- Hot table partitioned (or sharded) with **zero downtime**; p95 ±5% of baseline during cutover.
- Nightly automated restore validates backups with checksums; **RTO ≤ 15 min** on restore env; **RPO ≤ 5 min** verified.
- Tail-based sampling retains **≥95%** of error traces while cutting volume ≥60%.
- Search canary shows **≥10%** improvement in ERR@10 or recall, no latency regression >5%.
- 100% sensitive queries gated by **PBA prompt**; immutable evidence stored with authority link.
- Predictive autoscaling reduces cold-start/SLA dips; cost report shows **≥8%** saving vs prior sprint.

---

## 3) Risk Register

| Risk                                         | Prob | Impact | Mitigation                                               | Owner    |
| -------------------------------------------- | ---: | -----: | -------------------------------------------------------- | -------- |
| Partition routing bug duplicates/misses rows |    M |      H | Dual-write + reconciliation; checksums; read adapters    | Platform |
| Restore job exhausts IOPS                    |    M |      M | Off-peak window; rate limit; smaller instance class      | SRE      |
| Tail-sampling hides rare-but-bad traces      |    L |      H | Rules include errors/latency outliers regardless of tail | Obs      |
| Relevance canary disagrees with prod         |    M |      M | Shadow traffic + human-in-loop review; rollback          | Backend  |
| PBA friction for legitimate access           |    M |      M | Remember device + templated reasons; escalation path     | Security |

---

## 4) Backlog (Sprint-Scoped)

### EPIC-DSO: Data Scale-Out

- [ ] DSO-8001 — Partition DDL + routing triggers
- [ ] DSO-8002 — Backfill + dual-write with checksums
- [ ] DSO-8003 — Tenant-hash router lib + config map

### EPIC-BKP: Verified Backups

- [ ] BKP-8101 — Nightly automated restore + checksum job
- [ ] BKP-8102 — DR report generator (RTO/RPO)

### EPIC-OBS5: Adaptive Observability

- [ ] OBS5-8201 — Tail-based sampling config in OTel collector
- [ ] OBS5-8202 — Adaptive SLO alerts + burn windows
- [ ] OBS5-8203 — SLO gap analysis bot

### EPIC-SRCH: Search & Ingest Quality

- [ ] SRCH-8301 — Relevance canary harness (shadow eval)
- [ ] SRCH-8302 — Index/ANALYZE plan & jobs

### EPIC-PBA: Purpose-Based Access

- [ ] PBA-8401 — Reason-for-access prompts in admin flows
- [ ] PBA-8402 — Immutable audit writer + retention tags

### EPIC-FIN5: Forecasting & Janitor

- [ ] FIN5-8501 — Forecast → HPA pre-warm controller
- [ ] FIN5-8502 — Savings-plan coverage + rightsizing report
- [ ] FIN5-8503 — Idle assets janitor v2 (auto-PR)

---

## 5) Scaffolds & Snippets

### 5.1 Partitioning DDL (Postgres)

**Path:** `ops/db/partitioning.sql`

```sql
-- Parent table
CREATE TABLE IF NOT EXISTS docs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  body JSONB NOT NULL
) PARTITION BY LIST (tenant_id);
-- Example partition
CREATE TABLE IF NOT EXISTS docs_t_a PARTITION OF docs FOR VALUES IN ('a');
-- Routing trigger (fallback when INSERT hits parent)
CREATE OR REPLACE FUNCTION docs_route() RETURNS TRIGGER AS $$
BEGIN
  EXECUTE format('INSERT INTO %I VALUES ($1.*)', 'docs_t_'||substr(NEW.tenant_id,1,1)) USING NEW;
  RETURN NULL; -- prevent parent insert
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER docs_route_tr BEFORE INSERT ON docs FOR EACH ROW EXECUTE FUNCTION docs_route();
```
````

### 5.2 Dual-write & Backfill (Node sketch)

**Path:** `services/docs-api/src/dualwrite.ts`

```ts
export async function saveDoc(doc) {
  await dbOld.insert('docs', doc); // legacy table
  await dbNew.insert('docs', doc); // partitioned/sharded
}
```

**Backfill job**
**Path:** `ops/db/backfill.ts`

```ts
const BATCH = 1000;
let last = 0;
while (true) {
  const rows = await old.query(
    'SELECT * FROM docs WHERE id>$1 ORDER BY id ASC LIMIT $2',
    [last, BATCH],
  );
  if (!rows.rowCount) break;
  await newdb.tx(async (t) => {
    for (const r of rows.rows) {
      await t.query(
        'INSERT INTO docs VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [r.id, r.tenant_id, r.created_at, r.body],
      );
    }
  });
  last = rows.rows.at(-1).id;
}
```

### 5.3 Restore Validation Job (K8s CronJob)

**Path:** `ops/restore/cronjob.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: restore-validate }
spec:
  schedule: '0 4 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: restore
              image: ghcr.io/your-org/restore-validate:latest
              env:
                - name: BACKUP_URL
                  value: s3://backups-primary/db/latest.dump
          restartPolicy: OnFailure
```

### 5.4 OTel Collector Tail-based Sampling

**Path:** `charts/otel/templates/collector-config.yaml`

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: long-latency
        type: latency
        latency: { threshold_ms: 1500 }
      - name: key-routes
        type: string_attribute
        string_attribute: { key: http.target, values: ['/search', '/docs/'] }
service:
  pipelines:
    traces: { processors: [tail_sampling, batch] }
```

### 5.5 Adaptive Alerts (Prometheus burn + SLO gap)

**Path:** `charts/monitoring/templates/slo-gap.yaml`

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata: { name: slo-gap }
spec:
  groups:
    - name: slo.gap
      rules:
        - alert: SLOGapFast
          expr: error_budget_burn_2x > 1
          for: 5m
          labels: { severity: page }
        - alert: SLOGapSlow
          expr: error_budget_burn_10x > 1
          for: 1h
          labels: { severity: warn }
```

### 5.6 Relevance Canary Harness

**Path:** `tools/search/canary.js`

```js
// run shadow queries against control & candidate index, compute ERR@k/recall, emit diff
```

### 5.7 Purpose-Based Access Prompt

**Path:** `services/admin/pba.tsx`

```tsx
export function ReasonPrompt({ onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <label>Reason for access</label>
      <textarea required placeholder="ticket #, authority, purpose" />
      <button type="submit">Confirm</button>
    </form>
  );
}
```

### 5.8 Predictive Autoscaling Controller (sketch)

**Path:** `controllers/prewarm.ts`

```ts
// read RPS forecast, adjust HPA minReplicas ahead of surge; revert after window
```

### 5.9 Savings-plan Coverage & Rightsizing

**Path:** `tools/cost/coverage.js`

```js
// fetch usage vs commitment; emit coverage %, suggestions
```

### 5.10 Idle Asset Janitor v2

**Path:** `.github/workflows/idle-janitor.yml`

```yaml
name: idle-janitor
on:
  schedule: [{ cron: '0 2 * * *' }]
jobs:
  sweep:
    runs-on: ubuntu-latest
    steps:
      - run: node tools/cleanup/find-idle.js | tee idle.json
      - run: node tools/cleanup/open-prs.js idle.json
```

---

## 6) Observability & Alerts

- **Dashboards**: partition lag & backfill progress, restore success & duration, trace sampling keep/drop rates, SLO gap, search canary diffs, PBA events, forecast vs actual replicas, savings coverage, idle assets.
- **Alerts**: partition routing errors, restore failures, sample rules mis-hit, search canary regression, missing PBA evidence, forecast miss (under-provision), idle assets spike.

---

## 7) Promotions & Gates

| Stage | Preconditions                          | Action                                                              | Verification                | Rollback                            |
| ----- | -------------------------------------- | ------------------------------------------------------------------- | --------------------------- | ----------------------------------- |
| dev   | Partition DDL reviewed; dual-write off | Dry-run backfill + routing tests                                    | Checksums match; p95 stable | Drop new route; keep legacy         |
| stage | Dev soak 24h                           | Enable dual-write + backfill; tail-sampling & adaptive alerts on    | No data loss; alert noise ↓ | Disable dual-write; revert sampling |
| prod  | Stage soak 48h; approvals              | Cutover read path to partitioned; PBA enforced; predictive pre-warm | SLOs green; evidence stored | Revert router; disable PBA gate     |

---

## 8) Acceptance Evidence

- Hash checksums before/after backfill; diff report shows 0 mismatches.
- Restore job logs & timestamps; RTO/RPO metrics; quarterly DR report artifact.
- Trace volume vs keep-rate charts; error traces retained ≥95%.
- Search canary report (ERR@10/recall) with improvement and latency delta.
- PBA audit entries with reason, authority, and retention tags.
- Forecast vs actual replica graphs; savings coverage report; idle janitor PRs.

---

## 9) Calendar & Ownership

- **Week 1**: Partition DDL & tests, restore job wiring, OTel tail-sampling, search canary harness, PBA prompt, forecasting input.
- **Week 2**: Dual-write + backfill, adaptive alerts, canary eval, DR report, janitor v2, acceptance pack, release cut.

Release cut: **2026-04-10 (Fri)** with staged rollout + rollback plan.

---

## 10) Issue Seeds

- DSO-8001/8002/8003, BKP-8101/8102, OBS5-8201/8202/8203, SRCH-8301/8302, PBA-8401/8402, FIN5-8501/8502/8503

---

_End of Sprint 36 plan._

```

```

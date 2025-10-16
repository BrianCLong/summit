# PR Pack 014 — Search Quality Ops, Offline Pipelines Reliability, Schema Evolution, Contracts & Perf Governance (Ready‑to‑merge)

Twelve PRs to lock in search/result quality, make offline pipelines rock‑solid, enforce analytics schema compatibility, and formalize cross‑service API contracts & performance budgets. Each PR has rollback + cutover.

---

## PR 156 — Search quality telemetry (click model signals)

**Purpose:** Capture query→impression→click/skip/dwell events for nDCG/ERR and online monitoring.

**Files**

**`server/search/telemetry.ts`**

```ts
import { Counter, Histogram } from 'prom-client';
export const impressions = new Counter({
  name: 'search_impressions_total',
  help: 'impressions',
  labelNames: ['tenant', 'qhash', 'rank', 'doc'],
});
export const clicks = new Counter({
  name: 'search_clicks_total',
  help: 'clicks',
  labelNames: ['tenant', 'qhash', 'rank', 'doc'],
});
export const dwell = new Histogram({
  name: 'search_dwell_seconds',
  help: 'dwell',
  labelNames: ['tenant', 'qhash', 'rank', 'doc'],
  buckets: [1, 3, 5, 10, 30, 60, 120],
});
export function logImpression(
  tenant: string,
  qhash: string,
  rank: number,
  doc: string,
) {
  impressions.inc({ tenant, qhash, rank, doc });
}
export function logClick(
  tenant: string,
  qhash: string,
  rank: number,
  doc: string,
) {
  clicks.inc({ tenant, qhash, rank, doc });
}
export function logDwell(
  tenant: string,
  qhash: string,
  rank: number,
  doc: string,
  sec: number,
) {
  dwell.observe({ tenant, qhash, rank, doc }, sec);
}
```

**`web/search/instrument.ts`**

```ts
// Adds data-rank attributes to results; posts click+dwell via /events
```

**Rollback:** Keep minimal metrics; remove telemetry calls.

---

## PR 157 — Query normalization & synonyms/typo tolerance (flagged rollout)

**Purpose:** Stabilize queries with normalization + synonyms, and guarded fuzzy matching.

**Files**

**`server/search/normalize.ts`**

```ts
export function normalize(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFKC');
}
```

**`search/config/synonyms.yaml`**

```yaml
- from: ['k8s', 'kubernetes']
  to: 'kubernetes'
- from: ['pg', 'postgres', 'postgresql']
  to: 'postgres'
```

**`feature-flags/flags.yaml`** (append)

```yaml
search_synonyms: { default: false, owners: [search] }
search_fuzzy: { default: false, owners: [search] }
```

**Rollback:** Disable flags; revert to exact matching only.

---

## PR 158 — Offline pipeline hardening (Airflow/Dagster) with SLAs & idempotency

**Purpose:** Reliable nightly/weekly jobs with retries, SLAs, and idempotent tasks.

**Files**

**`pipelines/airflow/dags/search_offline.py`**

```py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

def build_index(ds, **kwargs):
  # idempotent: write to s3://indexes/tmp/<run_id>/ then atomically promote
  pass

def promote_index(ds, **kwargs):
  # atomically swap manifest pointer
  pass

def sla_miss_callback(dag, task_list, blocking_task_list, slas, blocking_tis):
  print("SLA MISS", task_list)

dag = DAG('search_offline', start_date=datetime(2025,1,1), schedule='0 2 * * *', catchup=False, default_args={
  'retries': 3, 'retry_delay': timedelta(minutes=10), 'sla': timedelta(hours=2)
}, sla_miss_callback=sla_miss_callback)

build = PythonOperator(task_id='build', python_callable=build_index, dag=dag)
promote = PythonOperator(task_id='promote', python_callable=promote_index, dag=dag)
build >> promote
```

**Rollback:** Run jobs manually; remove SLA/atomic promote.

---

## PR 159 — Index build manifest + checksum + promote

**Purpose:** Immutable builds with integrity; safe promotion.

**Files**

**`search/index/manifest.json`** (example)

```json
{
  "version": 2,
  "built_at": "2025-09-07T00:00:00Z",
  "sha256": "<calculated>",
  "docs": 1203949
}
```

**`scripts/index_checksum.ts`**

```ts
// compute sha256 over sorted list of shard files; write into manifest.json
```

**`scripts/index_promote.ts`**

```ts
// move s3://indexes/tmp/<run> -> s3://indexes/active/<date>/ and update s3://indexes/current.json
```

**Rollback:** Keep current index; discard tmp build.

---

## PR 160 — Great Expectations data quality gates (ETL & training sets)

**Purpose:** Block promotion if data shape/distribution drifts or nulls explode.

**Files**

**`data/gx/expectations/search_dataset.yml`**

```yaml
expectations:
  - expect_table_row_count_to_be_between: { min_value: 100000 }
  - expect_column_values_to_not_be_null: { column: 'doc_id' }
  - expect_column_values_to_be_between:
      { column: 'score', min_value: 0, max_value: 1 }
```

**`.github/workflows/data-quality.yml`**

```yaml
name: data-quality
on: [workflow_dispatch]
jobs:
  gx:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run GX
        run: great_expectations checkpoint run search_dataset
```

**Rollback:** Make report‑only; no blocking.

---

## PR 161 — Ground‑truth curation workflow & label QA

**Purpose:** Sustainable judgments with inter‑rater agreement checks.

**Files**

**`mlops/judgments/schema.yaml`**

```yaml
fields: [query, doc_id, label]
labels: { 0: 'bad', 1: 'okay', 2: 'good' }
```

**`mlops/judgments/validate.ts`**

```ts
// compute Cohen's kappa / Krippendorff's alpha; fail export if < 0.6
```

**`.github/workflows/labels-validate.yml`** — run on changes under `mlops/judgments/`.

**Rollback:** Lower threshold; advisory only.

---

## PR 162 — Analytics schema registry (JSON Schema) + compatibility checks

**Purpose:** Prevent breaking changes to event schemas; enforce additive changes.

**Files**

**`analytics/schemas/event.user_login.v1.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["user_id", "ts"],
  "properties": {
    "user_id": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "method": { "type": "string" }
  }
}
```

**`scripts/schema_compat.ts`**

```ts
// Compare new schema to previous version: required fields cannot be removed; types cannot narrow; additional fields allowed.
```

**`.github/workflows/schema-compat.yml`**

```yaml
name: analytics-schema-compat
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/schema_compat.ts analytics/schemas
```

**Rollback:** Mark specific versions as breaking with explicit migration note.

---

## PR 163 — dbt contracts/tests + freshness

**Purpose:** Enforce contracts at the warehouse layer; alert on stale sources.

**Files**

**`warehouse/dbt_project.yml`** (enable `contracts: true`).

**`warehouse/models/search/events.yml`**

```yaml
version: 2
models:
  - name: fct_search_events
    columns:
      - name: tenant_id
        tests: [not_null]
      - name: score
        tests:
          - dbt_utils.accepted_range: { min_value: 0, max_value: 1 }
    config: { contract: true }
sources:
  - name: raw
    freshness:
      {
        warn_after: { count: 2, period: hour },
        error_after: { count: 4, period: hour },
      }
```

**`.github/workflows/dbt.yml`** — run `dbt build --select state:modified+`.

**Rollback:** Disable `contracts`; keep tests only.

---

## PR 164 — Cross‑service API contracts + performance governance (SLC)

**Purpose:** Require both schema and perf budgets for every endpoint across services.

**Files**

**`contracts/slc.yaml`**

```yaml
services:
  web:
    /search:
      schema: api/openapi.yaml#/paths/~1search/get
      slo: { p95: 1.2, err: 0.02 }
    /export:
      schema: api/openapi.yaml#/paths/~1export/post
      slo: { p95: 2.0, err: 0.03 }
```

**`scripts/slc_gate.ts`**

```ts
// Ensure every new/changed route has an SLC entry; query Prom for current p95/err and fail if > SLC
```

**`.github/workflows/slc-gate.yml`** — required on PR & pre‑release.

**Rollback:** Warn‑only; manual approvals for exceptions.

---

## PR 165 — Parquet compaction & ZSTD tuning for analytics lake

**Purpose:** Improve read performance & cost for Athena/Trino.

**Files**

**`workers/lake/compact.ts`**

```ts
// Merge small Parquet files per partition into ~256MB targets; rewrite with ZSTD level 7; keep old for 7 days
```

**`infra/glue/partition_maintenance.tf`** — glue crawler or scheduled MSCK repair.

**Rollback:** Pause compaction; retain small files.

---

## PR 166 — Canary for ETL/feature jobs with data diff

**Purpose:** Validate ETL changes by running canary job against sample and diff outputs.

**Files**

**`pipelines/airflow/plugins/data_diff.py`**

```py
# Compare canary vs control tables; fail if rowcount delta > 1% or key mismatches > 0.1%
```

**`.github/workflows/etl-canary.yml`** — run on PRs touching `pipelines/`.

**Rollback:** Manual SQL review only; disable diff job.

---

## PR 167 — Index privacy filter + PII scrubbing job

**Purpose:** Ensure no PII leaks into search index; retroactively scrub if found.

**Files**

**`search/privacy/rules.yaml`**

```yaml
patterns:
  - email: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
  - ssn: "\\b\\d{3}-\\d{2}-\\d{4}\\b"
```

**`workers/index/scrub.ts`**

```ts
// Scan index shards for PII patterns; replace or delete docs; emit metrics and report
```

**Rollback:** Alert‑only mode; no destructive scrubs.

---

# Cutover (half day)

1. Enable **search telemetry** and **query normalization** in stage; verify metrics populate.
2. Stand up **offline pipeline** with manifest/promote; run first canary build.
3. Wire **Great Expectations** to the pipeline; keep report‑only for one run.
4. Check in **schema registry** & **dbt contracts**; run compatibility tests.
5. Add initial **SLC** entries for hot routes; hook SLC gate into verify‑release.
6. Enable **PII index scrub** in dry‑run; verify zero false positives.
7. Start **Parquet compaction** on old partitions; measure read gains.
8. Turn on **ETL canary data diff**; expand coverage weekly.

# Rollback

- Disable telemetry modules and flags; revert to current search behavior.
- Promote only from last good index; skip manifest promotion.
- Make GE/dbt/SLC gates advisory; log only.
- Pause compaction & scrub jobs.

# Ownership

- **Search/ML:** PR 156–159, 161, 167
- **Data/ETL:** PR 158, 160, 165–166
- **Analytics/Warehouse:** PR 162–163, 165
- **Platform/Release:** PR 164

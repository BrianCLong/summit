# PR Pack 015 — Chaos Playbooks, Blue/Green Index Flips, Realtime Feature Store, Self‑Serve Quality Dashboards (Ready‑to‑merge)

Twelve PRs to operationalize search in production: chaos scenarios + runnable playbooks for search & stores, supervised blue/green index flips with shadow‑read comparators and golden‑query gates, a minimal realtime feature store, and self‑serve search quality dashboards. Each PR has rollback + cutover.

---

## PR 168 — Chaos scenarios & runnable playbooks (Search/Neo4j/Redis)

**Purpose:** Practice common failure modes with scripted drills and clear runbooks.

**Files**

**`runbooks/search/latency-spike.md`** — steps, metrics to watch, rollback.

**`k8s/chaos/search-latency.yaml`**

```yaml
apiVersion: batch/v1
kind: Job
metadata: { name: chaos-search-latency, namespace: stage }
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: stress
          image: alpine
          securityContext: { capabilities: { add: ['NET_ADMIN'] } }
          command: ['/bin/sh', '-c']
          args:
            [
              'apk add --no-cache tc && tc qdisc add dev eth0 root netem delay 250ms && sleep 300 && tc qdisc del dev eth0 root netem',
            ]
```

**`k8s/chaos/neo4j-partition.yaml`** — simulate partial network partition on one core.

**`k8s/chaos/redis-evict.yaml`** — lower maxmemory to trigger controlled evictions.

**`docs/gameday/checklist.md`** — preflight, comms, abort/rollback criteria.

**Rollback:** Delete Jobs; restore configs; verify golden signals back to baseline.

---

## PR 169 — Blue/Green index flip controller

**Purpose:** Atomic index pointer swap with health/quality checks and instant rollback.

**Files**

**`search/index/pointer.json`**

```json
{ "current": "s3://indexes/active/2025-09-01/manifest.json" }
```

**`scripts/index_flip.ts`**

```ts
import fs from 'fs';
import fetch from 'node-fetch';
async function metric(q: string) {
  const r = await fetch(
    process.env.PROM_URL + '/api/v1/query?query=' + encodeURIComponent(q),
  );
  const j = await r.json();
  return Number(j.data.result?.[0]?.value?.[1] || 0);
}
async function main() {
  const candidate = process.env.CANDIDATE!; // s3 URI
  const err = await metric('route:error_rate:ratio5m{path="/search"}');
  const p95 = await metric('route:latency:p95{path="/search"}');
  if (err > 0.03 || p95 > 1.8) throw new Error('Guardrail breached');
  const pointer = { current: candidate };
  fs.writeFileSync(
    'search/index/pointer.json',
    JSON.stringify(pointer, null, 2),
  );
  console.log('Promoted', candidate);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

**`.github/workflows/index-flip.yml`**

```yaml
name: index-flip
on: workflow_dispatch
jobs:
  flip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/index_flip.ts
        env:
          PROM_URL: ${{ secrets.PROM_URL }}
          CANDIDATE: ${{ inputs.candidate }}
```

**Rollback:** Re‑point `pointer.json` to last stable; re‑run workflow.

---

## PR 170 — Shadow read comparator (A/B index diff)

**Purpose:** Compare top‑K from current vs candidate index online; emit mismatch metrics.

**Files**

**`server/search/shadow.ts`**

```ts
import { compare } from './util/diff';
export async function shadowQuery(q) {
  const cur = await searchActive(q);
  const cand = await searchCandidate(q);
  const { jaccard, overlapAt10 } = compare(cur.top10, cand.top10);
  metrics.shadow_overlap10.observe(overlapAt10);
  if (overlapAt10 < 0.6) metrics.shadow_low_overlap_total.inc();
  return cur; // serve active results, record cand
}
```

**`observability/prometheus/search-shadow-rules.yaml`**

```yaml
groups:
  - name: search-shadow
    rules:
      - record: search_shadow_overlap_at_10
        expr: histogram_quantile(0.5, sum(rate(search_shadow_overlap10_bucket[5m])) by (le))
      - alert: ShadowOverlapLow
        expr: search_shadow_overlap_at_10 < 0.6
        for: 10m
```

**Rollback:** Disable shadow path; keep active only.

---

## PR 171 — Golden query bank & watchlist gate

**Purpose:** Guard rollouts with a curated set of queries and expected stability.

**Files**

**`search/golden/queries.txt`** — one per line (per tenant if needed).

**`scripts/golden_gate.ts`**

```ts
// Run queries against active & candidate; fail if > X% significant regressions in nDCG@10
```

**`.github/workflows/golden-gate.yml`** — required before index flip.

**Rollback:** Make advisory; require manual approval to proceed.

---

## PR 172 — Minimal realtime feature store (Feast‑lite)

**Purpose:** Online feature lookups with TTL, backed by Redis; CLI for materialization from Kafka or batch.

**Files**

**`featurestore/registry.yaml`**

```yaml
entities:
  - name: user
    join_key: user_id
features:
  - name: user_recent_clicks
    dtype: int
    ttl: 3600
    source: kafka: clicks
```

**`server/features/sdk.ts`**

```ts
import { createClient } from 'redis';
const r = createClient({ url: process.env.REDIS_URL });
export async function getFeatures(userId: string) {
  const clicks = Number((await r.get(`fs:user_recent_clicks:${userId}`)) || 0);
  return { user_recent_clicks: clicks };
}
```

**`workers/features/materialize.ts`**

```ts
// Consume Kafka 'clicks' → update Redis keys with expiry
```

**Rollback:** Fallback to default feature values when store is empty/unavailable.

---

## PR 173 — Online quality metrics stream (CTR/nDCG approximations)

**Purpose:** Compute rolling CTR and approximate nDCG from click telemetry in near‑real‑time.

**Files**

**`workers/quality/stream.ts`**

```ts
// Consume impressions/clicks; compute CTR per query/tenant, emit Prom metrics; write hourly aggregates
```

**`observability/prometheus/search-quality-rules.yaml`**

```yaml
groups:
  - name: search-quality
    rules:
      - record: search_ctr_5m
        expr: sum(rate(search_clicks_total[5m])) / sum(rate(search_impressions_total[5m]))
      - alert: CTRDrop
        expr: search_ctr_5m < 0.5 * scalar(avg_over_time(search_ctr_5m[1d]))
        for: 30m
```

**Rollback:** Disable worker; rely on offline evals only.

---

## PR 174 — Self‑serve search quality dashboards

**Purpose:** Give teams instant visibility: CTR, dwell, overlap, shadow mismatch, golden‑query outcomes.

**Files**

**`observability/grafana/dashboards/search-quality.json`** — panels for CTR, dwell hist, overlap@10, golden gate pass rate, index version vs metrics.

**`observability/grafana/folders.json`** — folder structure per team; owner labels.

**Rollback:** Keep internal PromQL bookmarks; no dashboards.

---

## PR 175 — Error budget policy & deploy freeze automation (search)

**Purpose:** If search error budget is burned, freeze promotions until recovered or exception approved.

**Files**

**`policy/error-budget/search.yaml`**

```yaml
objective: 99.9
window: 30d
freeze_on:
  fast_burn: true
  remaining_budget_percent_lt: 20
approvers: ['sre@intelgraph', 'search-lead@intelgraph']
```

**`.github/workflows/freeze-guard.yml`**

```yaml
name: freeze-guard
on: [workflow_call]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: node scripts/error_budget_check.js
```

**Rollback:** Disable guard; track budget manually.

---

## PR 176 — Runnable playbooks & /playbook ChatOps

**Purpose:** Turn runbooks into parameterized, auditable actions.

**Files**

**`runbooks/actions/flip_index.yml`** — steps used by GH Action/ChatOps.

**`.github/workflows/playbook.yml`**

```yaml
name: playbook
on:
  issue_comment:
    types: [created]
jobs:
  run:
    if: startsWith(github.event.comment.body, '/playbook ')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run playbook
        run: node scripts/run_playbook.js "${{ github.event.comment.body }}"
```

**Rollback:** Keep static runbooks; remove ChatOps coupling.

---

## PR 177 — Blue/Green index watcher & automatic rollback

**Purpose:** Watch post‑flip metrics; roll back if guardrails breach within soak window.

**Files**

**`workers/index/watcher.ts`**

```ts
// Poll PromQL for error rate/latency/overlap; if thresholds exceeded, revert pointer.json to last stable
```

**`k8s/cron/index-watcher.yaml`** — run every 1m during soak window.

**Rollback:** Disable watcher; manual rollback via workflow.

---

## PR 178 — Feature TTL guard & stale‑feature fail‑open

**Purpose:** Prevent stale features from corrupting ranking; fail‑open with defaults and metric.

**Files**

**`server/features/guard.ts`**

```ts
export function assertFresh(features: Record<string, any>, maxAgeSec = 3600) {
  const now = Date.now() / 1000;
  for (const [k, v] of Object.entries(features)) {
    if (v && typeof v === 'object' && v._ts && now - v._ts > maxAgeSec) {
      metrics.stale_features_total.inc({ feature: k });
      delete features[k]; // fail-open: drop feature
    }
  }
  return features;
}
```

**Rollback:** Log‑only; do not drop stale features.

---

## PR 179 — Quality release notes & KPI checklist

**Purpose:** Document quality impact each release; force owners to confirm gates passed.

**Files**

**`.github/PULL_REQUEST_TEMPLATE.md`** (append)

```md
- [ ] Golden queries pass ≥ 98% (link)
- [ ] Shadow overlap@10 ≥ 0.6 (link)
- [ ] CTR rolling 5m within 10% of 7‑day avg (link)
- [ ] Error budget burn within policy (link)
```

**`docs/release/quality-template.md`** — human‑readable narrative of index/model changes & observed metrics.

**Rollback:** Keep existing PR template.

---

# Cutover (half day)

1. Land **chaos scenarios** and run a 30‑min GameDay in **stage** (latency spike + Redis evictions). Capture learnings.
2. Deploy **shadow comparator** and **golden query gate** in audit‑only; build candidate index and record overlap.
3. Stand up **feature store** with one feature (`user_recent_clicks`); wire guard for TTL; use defaults on misses.
4. Publish **search quality dashboards**; verify panels/links.
5. Run an **index flip** in stage using workflow; enable **watcher auto‑rollback** during soak.
6. Turn on **error budget freeze** in warn‑only; enable blocking after first clean week.
7. Integrate **runnable playbooks** with ChatOps for flip/rollback.

# Rollback

- Disable shadow comparator and gates; serve from active index only.
- Revert pointer to last stable; stop watcher.
- Disable feature store reads; use defaults.
- Remove chaos jobs; keep docs.
- Turn off freeze guard; rely on manual approvals.

# Ownership

- **Search/ML:** PR 169–171, 173–174, 177–179
- **Platform/SRE:** PR 168, 174–177
- **Data/Streaming:** PR 172–173, 178

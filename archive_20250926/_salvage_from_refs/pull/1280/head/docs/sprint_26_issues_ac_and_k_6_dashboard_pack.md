# Sprint 26 — Issues, Acceptance Criteria, and Load/Observability Pack

**Scope:** Concrete GitHub issues (epics → stories → tasks), acceptance criteria & verification, k6 profiles, and dashboard JSON skeletons.  
**Milestone:** `milestone: Sprint 26` (Sep 22 – Oct 3, 2025)

---

## GitHub Project Setup
- **Project:** `IntelGraph • GA Cutover & Scale (Sprint 26)`
- **Columns:** Todo → In Progress → In Review → Ready for Staging → Done
- **Labels:** `epic`, `story`, `task`, `P0`–`P6`, `security`, `policy`, `perf`, `er`, `cd`, `observability`, `cost`, `runbook`
- **Default Issue Template:** `/.github/ISSUE_TEMPLATE/sprint26.yaml`

```yaml
name: Sprint 26 Work Item
labels: [story]
body:
  - type: markdown
    attributes:
      value: |
        **Goal:** <what>
        **Owner:** <who>
        **Priority:** P<0-6>
  - type: textarea
    id: ac
    attributes: { label: Acceptance Criteria }
  - type: textarea
    id: verify
    attributes: { label: Verification Steps (evidence paths) }
  - type: checkboxes
    id: done
    attributes:
      label: Definition of Done
      options:
        - label: Tests updated
        - label: Dashboards/alerts updated
        - label: Evidence artifacts committed
```

---

## Epics → Issues

### Epic P0 — SLO Alignment & Performance Envelope (`labels: [epic,P0,perf]`)
**Issue:** `EPIC: Gateway & Graph SLOs aligned to org defaults`
- **AC:** Reads p95 ≤ 350 ms / p99 ≤ 900 ms; Writes p95 ≤ 700 ms; 1‑hop ≤ 300 ms; 2–3 hop ≤ 1,200 ms at 2× expected RPS; burn‑rate alerts live.
- **Evidence:** `/evidence/perf/**/*`, Grafana export, k6 reports, traces.

**Stories/Tasks**
1. `STORY: Persisted queries & response cache` (`labels: [story,P0,perf]`)
   - **Tasks:**
     - `TASK: PQ registry + sha256 routing` (`labels: [task,perf]`)
     - `TASK: Per‑tenant cache keys (ABAC scope)`
     - `TASK: Cache invalidation rules (schema hash)`
   - **AC:** Cache hit ratio ≥ 80% on top 10 reads.
   - **Verify:** k6 profile S26‑PQ; Prom metrics `gateway_cache_*`.

2. `STORY: NL→Cypher plan cache & tracing` (`labels: [story,P0,perf]`)
   - **Tasks:**
     - `TASK: Plan cache keyed by NL intent + filters`
     - `TASK: Trace exemplars linking to audit IDs`
   - **AC:** P95 NLQ reduced ≥ 20% on golden path.
   - **Verify:** Compare p95 before/after; attach traces.

3. `STORY: Neo4j tuning & read‑replica pinning` (`labels: [story,P0,perf]`)
   - **Tasks:** `TASK: Hint templates`, `TASK: Page cache sizing`, `TASK: Replica pin by tenant`.
   - **AC:** 1‑hop p95 ≤ 300 ms; 2–3 hop p95 ≤ 1,200 ms.
   - **Verify:** Cypher profiling + k6 graph profile.

4. `STORY: Burn‑rate alerts (fast/slow)` (`labels: [story,P0,observability]`)
   - **Tasks:** `TASK: PrometheusRule`, `TASK: AlertManager route`, `TASK: Runbook link`.
   - **AC:** Alerts fire in simulation; on‑call page received.
   - **Verify:** Alert test logs in `/evidence/perf/alerts/`.

---

### Epic P1 — ER Adjudication v1 Productionization (`labels: [epic,P1,er]`)
- **AC:** Intake ≥1,000 ev/s/pod p95 ≤100 ms; lag <60s @2× peak; DLQ <0.1%.
- **Stories:** Backpressure & DLQ; UI bulk ops; lag/error alerts & audit.
- **Evidence:** `/evidence/er/**/*`.

Tasks include: `idempotency keys`, `DLQ + replay tool`, `Prom metrics`, `Playwright e2e`, `golden fixtures`.

---

### Epic P2 — Policy Reasoner Phase‑1 (`labels: [epic,P2,policy]`)
- **AC:** Retention tiers & purpose tags enforced; license/TOS gate exports; explain output.
- **Evidence:** `/evidence/policy/**/*` decision logs.

Stories: `Retention & purpose OPA`, `Export license gate`, `CI simulation + explain`.

---

### Epic P3 — Security Step‑Up & Session Binding (`labels: [epic,P3,security]`)
- **AC:** Step‑up on `@sensitive` mutations; audit includes challenge IDs; rotation drill complete.
- **Evidence:** `/evidence/security/**/*`.

Stories: `Sensitive directive + middleware`, `Session→credential binding`, `Secrets rotation drill`.

---

### Epic P4 — Provenance Everywhere (`labels: [epic,P4,cd]`)
- **AC:** Verify‑Bundle required; tamper test blocks; release includes evidence bundle.
- **Evidence:** `/evidence/provenance/**/*`.

---

### Epic P5 — Cost Guardrails & Obs Hygiene (`labels: [epic,P5,cost,observability]`)
- **AC:** Telemetry cost −30% w/ preserved diagnostics; 80% budget alerts.
- **Evidence:** `/evidence/cost/**/*`.

---

### Epic P6 — DR & Change‑Freeze Drills (`labels: [epic,P6,runbook]`)
- **AC:** Drill notes in `/runbooks/` & `/evidence/dr/`; RTO/RPO documented.

---

## Acceptance Criteria & Verification Templates

**Template (paste into issues):**
```md
### Acceptance Criteria
- [ ] <Measurable SLO>
- [ ] <Functional constraint>
- [ ] <Security/Policy guardrail>

### Verification Steps
1. <Command / script> → expected <threshold>
2. Capture Grafana export → commit at `/evidence/<area>/...`
3. Attach k6 report + trace exemplars
```

---

## k6 Profiles (ready‑to‑run)

### S26‑PQ — Gateway Reads (Persisted Queries, 2× RPS)
`tools/k6/s26-pq.js`
```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    reads: {
      executor: 'ramping-arrival-rate',
      startRate: 100, // base RPS
      timeUnit: '1s',
      preAllocatedVUs: 50,
      stages: [
        { duration: '5m', target: 200 },   // 2× expected
        { duration: '5m', target: 300 },   // spike
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<350', 'p(99)<900'],
    http_req_failed: ['rate<0.001'],
  },
};

const PQ = __ENV.PQ_HASH; // sha256 of persisted query
const URL = __ENV.URL || 'https://gateway/graphql';

export default function () {
  const res = http.post(URL, JSON.stringify({
    operationName: 'GetEntity',
    extensions: { persistedQuery: { version: 1, sha256Hash: PQ } },
    variables: { id: 'G123' },
  }), { headers: { 'Content-Type': 'application/json' }});
  check(res, { '200': (r) => r.status === 200 });
  sleep(0.1);
}
```

### S26‑W — Writes (Mutations with Step‑Up)
`tools/k6/s26-writes.js`
```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 30,
  duration: '10m',
  thresholds: {
    http_req_duration: ['p(95)<700', 'p(99)<1500'],
    http_req_failed: ['rate<0.001'],
  },
};

const URL = __ENV.URL;
const TOKEN = __ENV.TOKEN;          // session token
const STEPUP = __ENV.STEPUP_ASSERT;  // proof of WebAuthn step‑up

export default function () {
  const payload = {
    operationName: 'MergeEntity',
    query: 'mutation Merge($input: MergeInput!){ mergeEntity(input:$input){ id status }}',
    variables: { input: { id: 'G123', attrs: { name: 'ACME' } } },
  };
  const res = http.post(URL, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, 'X-StepUp-Assert': STEPUP },
  });
  check(res, { '200': (r) => r.status === 200 });
  sleep(0.2);
}
```

### S26‑G — Graph Traversal (2–3 hop)
`tools/k6/s26-graph.js`
```js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 40,
  duration: '12m',
  thresholds: { http_req_duration: ['p(95)<1200'] },
};

const URL = __ENV.URL;

export default function () {
  const q = `query Path($id: ID!,$d:Int!){ path(from:$id,depth:$d){ nodes{ id } edges{ rel }}}`;
  const res = http.post(URL, JSON.stringify({ operationName: 'Path', query: q, variables: { id: 'G123', d: 3 } }), { headers: { 'Content-Type': 'application/json' }});
  check(res, { '200': (r) => r.status === 200 });
}
```

---

## Grafana Dashboard Skeletons

### Gateway SLO Overview
`ops/observability/dashboards/gateway-slo.json`
```json
{
  "title": "Gateway SLO Overview",
  "panels": [
    { "type": "timeseries", "title": "p95 http_req_duration", "targets": [{ "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"gateway\"}[5m])) by (le))" }] },
    { "type": "timeseries", "title": "Error Rate", "targets": [{ "expr": "sum(rate(http_request_errors_total{job=\"gateway\"}[5m])) / sum(rate(http_requests_total{job=\"gateway\"}[5m]))" }] },
    { "type": "stat", "title": "Cache Hit %", "targets": [{ "expr": "sum(rate(gateway_cache_hits_total[5m])) / sum(rate(gateway_cache_requests_total[5m])) * 100" }] }
  ]
}
```

### ER Queue Health
`ops/observability/dashboards/er-queue.json`
```json
{
  "title": "ER Queue Health",
  "panels": [
    { "type": "timeseries", "title": "Throughput ev/s", "targets": [{ "expr": "sum(rate(er_intake_events_total[1m]))" }] },
    { "type": "timeseries", "title": "Queue Lag (s)", "targets": [{ "expr": "max(er_queue_age_seconds)" }] },
    { "type": "timeseries", "title": "DLQ Rate %", "targets": [{ "expr": "sum(rate(er_dlq_events_total[5m])) / sum(rate(er_intake_events_total[5m])) * 100" }] }
  ]
}
```

---

## Prometheus Rules — Burn‑Rate (finalized)
`ops/observability/slo-alerts.yaml`
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gateway-slo-burn
spec:
  groups:
  - name: gateway.slo
    rules:
    - alert: APISLOFastBurn
      expr: (
        sum(rate(http_request_errors_total{job="gateway"}[5m]))
        / sum(rate(http_requests_total{job="gateway"}[5m]))
      ) > (0.001 * 14.4)
      for: 5m
      labels: {severity: page}
      annotations:
        summary: "API SLO fast burn"
    - alert: APISLOSlowBurn
      expr: (
        sum(rate(http_request_errors_total{job="gateway"}[1h]))
        / sum(rate(http_requests_total{job="gateway"}[1h]))
      ) > (0.001 * 2)
      for: 2h
      labels: {severity: ticket}
      annotations:
        summary: "API SLO slow burn"
```

---

## CI Gates — Perf & Policy

### k6 in CI
`.github/workflows/gateway-perf.yml`
```yaml
name: gateway-perf
on: [pull_request]
jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tools/k6/s26-pq.js
        env:
          URL: ${{ secrets.STAGING_GATEWAY_URL }}
          PQ_HASH: ${{ secrets.PQ_HASH }}
      - name: Upload report
        uses: actions/upload-artifact@v4
        with: { name: k6-report, path: results/* }
```

### OPA Policy Simulation
`.github/workflows/policy-ci.yml` (add stage)
```yaml
  policy-sim:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: OPA test
        run: |
          opa test -v security/policy -c
          opa eval -f pretty -d security/policy 'data.intelgraph.allow'
```

---

## Evidence Tree (to commit)
```
/evidence
  /perf
    k6-s26-pq.json
    k6-s26-writes.json
    grafana-gateway-slo.json
    traces/
  /er
    throughput.csv
    lag-dlq.json
  /policy
    decisions.log
    explains/
  /security
    webauthn-stepup.log
    rotation-receipts/
  /provenance
    attestations/
    tamper-test.log
  /cost
    before.csv
    after.csv
/runbooks
  dr-drill.md
  freeze-window-dryrun.md
```

---

## RACI Snapshot (Owners)
- Gateway perf: **R** Gateway TL · **A** Eng Mgr · **C** SRE/DBE · **I** Sec
- ER prod: **R** Data Eng TL · **A** Eng Mgr · **C** SRE · **I** PM
- Policy: **R** Platform TL · **A** CTO · **C** Legal · **I** Eng
- Security: **R** AppSec · **A** CISO · **C** Frontend · **I** SRE
- Provenance/CD: **R** DevEx · **A** Eng Mgr · **C** SRE · **I** All
- Cost/Obs: **R** SRE · **A** Eng Mgr · **C** Finance Ops · **I** Leads
- DR/Freeze: **R** SRE · **A** Eng Mgr · **C** TLs · **I** PM

---

## Notes
- Tie every issue to dashboards and evidence paths.  
- Block merges if perf thresholds fail or policy sim returns deny.


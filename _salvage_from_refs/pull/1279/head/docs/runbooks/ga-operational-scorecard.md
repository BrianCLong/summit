# IntelGraph GA Operational Scorecard & Runbook (Day‑0 → Day‑7)

**Audience:** SRE, Platform, Security, Backend, Frontend, Incident Commanders
**Goal:** Operate IntelGraph safely at GA, with clear SLOs, burn alerts, rollback switches, policy simulation flow, provenance verification in CD, and validated load/chaos test recipes.

---

## 1) Day‑0/Day‑7 Operational Scorecard

### 1.1 Service SLOs & Error Budgets

| Area         | SLI                   | SLO                 | Budget      | Notes                       |
| ------------ | --------------------- | ------------------- | ----------- | --------------------------- |
| Graph Read   | p95 latency           | ≤ 350 ms            | 0.5%/day    | Cached paths ≥ 85% hit‑rate |
| Graph Write  | p95 latency           | ≤ 700 ms            | 0.5%/day    | Includes ER side‑effects    |
| Availability | uptime                | ≥ 99.9%             | 43.2 min/mo | Measured at gateway 200/2xx |
| ER Pipeline  | DLQ rate              | < 0.1% msgs         | 0.1%/day    | Cat. A/B only; C benign     |
| Queues       | lag                   | < 60 s              | —           | p95 lag per category        |
| Security     | step‑up coverage      | ≥ 99% high‑risk ops | —           | WebAuthn enforced           |
| Provenance   | verified deploys      | 100%                | 0 miss      | All artifacts SLSA‑verified |
| Costs        | telemetry vs baseline | −60–80%             | —           | No SLO regression           |

### 1.2 Burn‑Rate Alerts (multi‑window)

* **Page** if error‑budget burn ≥ **14× for 5m** (rapid breach) or ≥ **6× for 30m** (sustained).
* **Warn** at **2× for 1h**; auto‑throttle low‑value traces & raise cache TTLs.

**PrometheusRule (excerpt):**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: intelgraph-slo-burn
spec:
  groups:
  - name: slo-burn
    rules:
    - alert: ReadLatencyBudgetBurnFast
      expr: slo:read_latency_errors:burnrate5m > 14
      for: 5m
      labels: {severity: page}
      annotations: {summary: "Read p95 burn ≥14x (5m)", runbook: "https://runbooks/intelgraph/slo"}
    - alert: ReadLatencyBudgetBurnSlow
      expr: slo:read_latency_errors:burnrate30m > 6
      for: 30m
      labels: {severity: page}
      annotations: {summary: "Read p95 burn ≥6x (30m)", runbook: "https://runbooks/intelgraph/slo"}
```

### 1.3 Go/No‑Go Panel (Grafana checklist)

* p95 **read ≤ 350 ms**, **write ≤ 700 ms**, error‑rate ≤ 0.1%
* ER **lag < 60 s**, **DLQ < 0.1%**, batch‑reprocess success ≥ 99.5%
* Security: ≥ 99% high‑risk ops required step‑up; 0 policy‑sim criticals
* Provenance: 100% deploys SLSA‑verified; 0 unsigned artifacts
* Cost: −60–80% telemetry vs baseline (adaptive sampling active)

---

## 2) Rollback Triggers & Switches

### 2.1 Immediate Rollback Triggers

* Read or write p95 SLO breach **> 15 min** across 3 consecutive 5‑min windows
* ER **lag > 120 s** or **DLQ > 0.5%** with Cat. A/B
* Provenance gate failure (unverified artifact)
* Security regression: step‑up coverage < 95% on high‑risk ops

### 2.2 Rollback Procedure (canary → stable)

```bash
# Freeze traffic ramp
kubectl -n edge scale deploy api-gateway --replicas=0
# Flip feature flags (read-only first)
flipt set intelgraph/canary_rw=false
# Roll back app
helm rollback intelgraph  <REV> --namespace prod --wait --timeout 5m
# Neo4j routing: pin writes to primary, reads to stable replicas
kubectl -n prod rollout restart deploy neo4j-router
# Cache: invalidate volatile keys, increase TTL on top 50 hashes
redis-cli --scan | xargs -n500 redis-cli del
# Verify: provenance, SLO panel, ER DLQ drain < 0.1%
```

### 2.3 Database Change Strategy (expand/contract)

* **Expand**: additive columns/labels + dual‑write
* **Migrate**: backfill job with progress metrics and rate caps
* **Flip**: read path to new schema behind flag
* **Contract**: remove legacy after 7 days with snapshot

---

## 3) Policy Simulation Workflow (Access & Licensing)

### 3.1 Change Flow

1. PR with **policy change** (Rego) + test vectors
2. **Simulation** against last **30 days** access logs (sampled @100% for 72h post‑GA)
3. **Diff report**: denials introduced, over‑permits, PII scope changes
4. **Two‑person review** (Security + Data Governance)
5. Merge → bundle signed → rollout with canary tenants

### 3.2 Rego Policy (excerpt)

```rego
package intelgraph.authz

default allow = false

high_risk_ops := {"export_dataset","bulk_delete","credential_link"}

allow {
  input.user.assurance == "webauthn"
  not deny
}

deny {
  input.op == high_risk_ops[_]
  not input.user.step_up
}

deny {
  input.resource.pii == true
  not input.user.scopes[_] == "pii:read"
}
```

### 3.3 Unit Test & Simulation Harness

```yaml
# conftest test
cases:
- name: export requires step-up
  input: {op: export_dataset, user: {assurance: pwd, step_up: false}, resource: {pii: false}}
  deny: true
- name: pii scope required
  input: {op: read, user: {assurance: webauthn, step_up: true, scopes: ["case:read"]}, resource: {pii: true}}
  deny: true
```

---

## 4) Provenance Verification in CD (SLSA3)

### 4.1 Gate Order

`SLSA verify → SBOM scan → OPA bundle pin → policy simulation → smoke → canary`

### 4.2 Pipeline Snippets

```bash
# Verify build provenance (in-toto/slsa-verifier)
slsa-verifier verify-artifact \
  --source-uri github.com/BrianCLong/intelgraph \
  --builder-id https://github.com/actions/runner \
  --provenance-path dist/attestation.intoto.jsonl \
  --artifact-path dist/*.tgz

# Verify signatures (cosign)
cosign verify --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/briancllong/intelgraph@${IMAGE_DIGEST}

# Enforce: block on any failure
```

---

## 5) Load & Chaos Test Recipes

### 5.1 k6 Soak Profile (1.25× peak, 2h)

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    reads: {executor: 'ramping-arrival-rate', startRate: 50, timeUnit: '1s', preAllocatedVUs: 200, stages: [
      {duration: '10m', target: 300}, {duration: '100m', target: 300}]},
    writes: {executor: 'constant-arrival-rate', rate: 60, timeUnit: '1s', duration: '120m', preAllocatedVUs: 300},
  },
  thresholds: {
    'http_req_duration{tag:read}': ['p(95)<350'],
    'http_req_duration{tag:write}': ['p(95)<700'],
    'http_req_failed': ['rate<0.001'],
  },
};

export default function () {
  const q = '{ node(id:"123"){ id name } }';
  const res = http.post(__ENV.API_URL, JSON.stringify({query:q}), { headers: { 'Content-Type':'application/json', 'x-apq-hash': __ENV.APQ_HASH } });
  check(res, { 'status 200': r => r.status === 200 });
  sleep(0.5);
}
```

### 5.2 Chaos Experiments (daily light, weekly heavy)

| Experiment         | Target    | Steady‑state          | Fault            | Expected                                     |
| ------------------ | --------- | --------------------- | ---------------- | -------------------------------------------- |
| Redis blip         | Caching   | p95 stable            | kill pod 30s     | Cache miss spike < 15%, SLO OK               |
| Neo4j replica loss | Read path | p95 read ≤ 350 ms     | cordon 1 replica | Router reroutes, no error surge              |
| Network latency    | Gateway   | p95 write ≤ 700 ms    | +150ms tc delay  | Backpressure engages, circuit breaker stable |
| OPA outage         | AuthZ     | 200s maintained       | deny‑by‑default  | Error spikes < 0.5%, incident declared       |
| WebAuthn provider  | Step‑up   | high‑risk ops blocked | simulate 503     | Step‑up fallback prompts + comms             |

> Use Chaos Mesh/Litmus; limit blast radius with labels `app=intelgraph,tenant=canary`.

---

## 6) Runbooks (detailed)

### 6.1 Perf Regression Hotfix

1. Enable persisted‑query **sticky LRU**; raise top‑N TTL (90s → 180s).
2. Route hot labels to **warm replica**; enforce router quotas.
3. Profile Cypher; add index hints; kill >1s offenders; attach query plans to JIRA.
4. Validate SLO panel; back out changes if no improvement in 10m.

### 6.2 ER DLQ Surge

1. Classify DLQ A/B/C; page if A/B > 0.5%.
2. Enable **batch‑reprocess** with category filter; cap RPS; observe queue lag.
3. If schema drift: enable dual‑write shim; rerun batch; attach diff report.
4. Exit when DLQ < 0.1% for 30m.

### 6.3 Policy Denial Appeals

1. Auto‑create ombuds ticket with **denied clause** + user context.
2. Run **policy simulator** on appeal sample; attach decision trace.
3. Approve temporary override with expiry; schedule policy PR.

### 6.4 DR Drill Quickstart

1. Replay last 60m ingress into staging; verify p95 SLOs.
2. Restore latest cross‑region snapshot; checksum exports.
3. Produce divergence report; file regressions.

### 6.5 Cost Overrun

1. Trigger **adaptive sampling** high mode; drop low‑value spans first.
2. Reduce log verbosity for chatty modules; confirm error budget unaffected.
3. Notify finance channel; attach forecast.

### 6.6 Cache Stampede

1. Enable **request coalescing**; random‑jitter TTLs (±20%).
2. Pre‑warm top 50 APQ hashes post‑deploy.
3. Watch hit‑rate panel; proceed when ≥85%.

### 6.7 Replica Hot‑Spotting

1. Activate shard/label‑aware routing.
2. Rebalance by tenant; add temporary read‑only replica.
3. Validate with per‑replica p95 diff < 15%.

### 6.8 WebAuthn Step‑Up Failure

1. Deny high‑risk ops; show fallback prompt.
2. Rotate to backup provider; inform incident channel.
3. Run post‑mortem with root cause and MTTD/MTTR metrics.

---

## 7) Dashboards (what to pin)

* **API**: p50/p95 latency (read/write), error rate, APQ hit‑rate, slow‑query count
* **ER**: ingress RPS, queue depth/lag per category, DLQ rate + reprocess success
* **Security**: step‑up coverage, policy‑sim failures, authz deny heatmap
* **Provenance**: verified releases per day, unsigned attempts, SBOM criticals
* **Infra**: CPU/mem by gateway/replica, Redis ops/s, GC pauses

---

## 8) Post‑GA Roadmap (mapped to Wishbook)

1. **Provenance & Claim Ledger** → verifiable disclosure bundles; external verification portal.
2. **NL→Cypher Sandbox** → explain plan, cost/row preview, undo/redo.
3. **GraphRAG** with evidence citations & source‑credibility scores.
4. **Tri‑pane UX** (timeline/map/graph) with synchronized brushing + “Explain this view.”
5. **Runbook Library v1 (10)** (CTI, Disinfo, SBOM Trace, HR Vetting, etc.).
6. **Ops Hardening**: chaos drills cadence, autoscaling policies, offline expedition kit v1.
7. **Entity Resolution v2**: active learning, confidence calibration, analyst feedback loops.
8. **Anomaly Detection**: streaming graph features + alert tuning toolkit.
9. **Multi‑tenant QoS**: fair‑share scheduler, per‑tenant budgets, noisy‑neighbor isolation.
10. **Export Pipeline**: license‑aware redaction, watermarking, shareable audit bundle.

---

## 9) Contacts & Ownership

* **Incident Commander (IC):** *Name • handle • on‑call*
* **SRE Primary:** *Name*
* **Platform Lead:** *Name*
* **Security Lead:** *Name*
* **Data Governance:** *Name*
* **Release Manager:** *Name*

---

## 10) Appendix

### 10.1 Feature Flags

* `canary_rw` (bool)
* `policy_dry_run` (bool)
* `apq_sticky_lru` (bool)
* `adaptive_sampling_mode` (enum: off|normal|high)

### 10.2 Environment

* `API_URL`, `APQ_HASH`, `OPA_BUNDLE_SHA`, `IMAGE_DIGEST`

### 10.3 Quick Links

* SLO Panel • ER Ops • Policy Simulator • Provenance Gate • Release Notes

> Print this page or export to PDF for the GA war room. Keep the runbooks pinned for the first 72 hours after cutover.

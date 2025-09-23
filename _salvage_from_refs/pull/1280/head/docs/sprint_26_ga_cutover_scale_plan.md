# Sprint 26 — GA Cutover & Scale Plan

**Theme:** Cutover & Scale with Guardrails  
**Duration:** 2 weeks (target: Sep 22 – Oct 3, 2025)  
**Mode:** Trunk-based; weekly cut → staging; biweekly → prod (pause if API error-budget < 50% remaining)  

---

## Conductor Summary
**Goal:** Move from “GA hardening” to “GA cutover & scale,” proving SLOs, cost guardrails, and operational readiness under 2× expected load.  
**Assumptions:** Persisted GraphQL queries, per-tenant cache keys, NL→Cypher plan cache, Neo4j read replicas tuned.  
**Non‑Goals:** New product features, connector expansion, major UI redesign.  
**Constraints:** Prod ≤ $18k/mo infra; LLM ≤ $5k/mo; freeze windows enforced; API error budget 0.1%, ingest 0.5%.  
**Risks:** SLO regressions, policy false positives, ER lag, telemetry cost drift.  
**Mitigations:** Canary + rollback, traffic shadowing, k6 load tests, OPA dry‑run, autoscaling & rate limits, cost dashboards + alerts.

**Definition of Done:**
- GraphQL reads p95 ≤ 350 ms / p99 ≤ 900 ms at 2× load; writes p95 ≤ 700 ms.  
- Neo4j 1‑hop p95 ≤ 300 ms; 2–3 hop p95 ≤ 1,200 ms.  
- ER queue stable (lag < 60s @ 2× peak; DLQ < 0.1%).  
- Policy reasoner enforces retention/licensing with human‑readable explain.  
- WebAuthn step‑up enforced on sensitive mutations with session binding.  
- Verify‑Bundle mandatory in CD; provenance tamper test blocks.  
- Cost dashboards + 80% budget alerts live; tracing cost −30% with maintained insight.  
- DR & freeze drills executed; runbooks updated with timestamps.  

---

## Epics → Stories → Tasks (MoSCoW)

### P0 — SLO Alignment & Performance Envelope (Must)
**Stories**
- S0.1 Persisted queries & response caching in Gateway.  
- S0.2 NL→Cypher plan cache + hot path tracing.  
- S0.3 Neo4j tuning (page cache, query hints, read‑replica pinning).  
- S0.4 Burn‑rate alerts (fast/slow) per SLO.

**Tasks**
- T0.1 Add persisted query registry + hash-based routing.  
- T0.2 Implement per‑tenant cache keys (ABAC/OPA scope).  
- T0.3 Introduce query templates with cost hints; limit result payloads.  
- T0.4 k6 load profiles for NLQ and Cypher; 2× RPS gates in CI.  
- T0.5 Prometheus histograms + trace exemplars; link trace IDs to audit.

**Acceptance & Verification**
- A0.1 k6 report: reads p95 ≤ 350 ms; writes p95 ≤ 700 ms; NLQ p95 ≤ 2 s; Cypher exec p95 ≤ 1.5 s.  
- A0.2 Neo4j 1‑hop ≤ 300 ms; 2–3 hop ≤ 1,200 ms under 2× load.  
- V0.1 Attach Grafana dashboard exports + traces to PRs; store in `/evidence/perf/`.

---

### P1 — ER Adjudication v1 Productionization (Must)
**Stories**
- S1.1 Backpressure + DLQ + idempotency.  
- S1.2 UI bulk actions/filters; keyboard shortcuts finalize.  
- S1.3 Lag/error alerts; audit logs for HIGH/MID/LOW bands.

**Tasks**
- T1.1 Introduce intake idempotency keys + exactly‑once semantics at write.  
- T1.2 DLQ topic + replay tool; rate limiters on intake.  
- T1.3 Prometheus metrics for queue depth, age, throughput; alert rules.  
- T1.4 Playwright e2e for adjudication flows; golden fixtures.  

**Acceptance & Verification**
- A1.1 Intake ≥ 1,000 events/s/pod, p95 ≤ 100 ms pre‑storage.  
- A1.2 Queue lag < 60 s @ 2× peak; DLQ < 0.1%.  
- V1.1 Replay results + dashboards committed to `/evidence/er/`.

---

### P2 — Policy Reasoner Phase‑1 (Privacy/Licensing) (Should)
**Stories**
- S2.1 Retention tiers + purpose tags enforced via OPA.  
- S2.2 License/TOS classes gate export; redaction/k‑anonymity for NLQ exports.  
- S2.3 CI policy simulation with human‑readable explain.

**Tasks**
- T2.1 Map data classes → {ephemeral‑7d, short‑30d, standard‑365d, long‑1825d, legal‑hold}.  
- T2.2 Implement export pipeline checks; deny with `explain.ts` integration.  
- T2.3 Unit packs for edge cases (purpose drift, mixed licenses).

**Acceptance & Verification**
- A2.1 PII defaults to short‑30d unless legal‑hold; policy CI green.  
- V2.1 Include decision logs + explains in `/evidence/policy/`.

---

### P3 — Security Step‑Up & Session Binding (Should)
**Stories**
- S3.1 Feature flag to require WebAuthn step‑up for sensitive mutations.  
- S3.2 Bind session → credential; audit with challenge IDs.  
- S3.3 Secrets rotation runbook & drill (staging).

**Tasks**
- T3.1 Annotate GraphQL schema with `@sensitive` directive → middleware.  
- T3.2 Persist challenge IDs in audit ledger; failure paths tested.  
- T3.3 Rotation playbook v1 with rollback; staged test.

**Acceptance & Verification**
- A3.1 Step‑up enforced on mutate:*; override via policy only.  
- V3.1 Playwright key test + audit review in `/evidence/security/`.

---

### P4 — Provenance Everywhere (Must)
**Stories**
- S4.1 Make Verify‑Bundle mandatory in CD; cosign key rotation.  
- S4.2 Provenance ledger export manifest v1.

**Tasks**
- T4.1 Add required check to `cd-guardrails.yml`; block on failed verification.  
- T4.2 Tamper test job (negative control) in pipeline.  
- T4.3 Key rotation runbook with attestations.

**Acceptance & Verification**
- A4.1 Failing provenance blocks deploy; evidence bundle attached to release.  
- V4.1 Tamper test artifacts in `/evidence/provenance/`.

---

### P5 — Cost Guardrails & Observability Hygiene (Could)
**Stories**
- S5.1 Per‑unit cost dashboards ( $/1M GraphQL calls, $/1k ingested ).  
- S5.2 80% budget alerts; trace sampling rules; cardinality review.

**Tasks**
- T5.1 Billing export → BigQuery/CSV → Grafana panels.  
- T5.2 Tail‑based sampling on top N slow endpoints; label drops for high‑card metrics.  
- T5.3 Alert routes to on‑call with runbook links.

**Acceptance & Verification**
- A5.1 Telemetry cost −30% with preserved diagnostics.  
- V5.1 Before/after cost diff recorded in `/evidence/cost/`.

---

### P6 — DR & Change‑Freeze Drills (Could)
**Stories**
- S6.1 Freeze‑window dry‑run incl. override procedure.  
- S6.2 Single‑region failover tabletop; Neo4j failover in staging.

**Tasks**
- T6.1 Execute freeze run; validate `tools/ci/check_freeze.js` override path.  
- T6.2 Document RTO/RPO; capture timings and gaps.  
- T6.3 Peer review & signoff.

**Acceptance & Verification**
- A6.1 Drill notes and timestamps committed to `/runbooks/` + `/evidence/dr/`.

---

## RACI & Estimates (snapshot)
- **Gateway perf (P0):** R: Gateway TL · A: Eng Mgr · C: SRE/DBE · I: Sec — **5–7 d**  
- **ER prod (P1):** R: Data Eng TL · A: Eng Mgr · C: SRE · I: PM — **5–6 d**  
- **Policy (P2):** R: Platform TL · A: CTO · C: Legal/Privacy · I: Eng — **4–5 d**  
- **Security (P3):** R: AppSec · A: CISO · C: Frontend · I: SRE — **3–4 d**  
- **Provenance (P4):** R: DevEx · A: Eng Mgr · C: SRE · I: All — **3–4 d**  
- **Cost/Obs (P5):** R: SRE · A: Eng Mgr · C: Finance Ops · I: Leads — **3–4 d**  
- **DR/Freeze (P6):** R: SRE · A: Eng Mgr · C: TLs · I: PM — **2–3 d**

---

## Engineering Contracts & Artifacts

### SLO Targets (Org Defaults enforced)
- **GraphQL Gateway** — Reads p95 ≤ 350 ms; Writes p95 ≤ 700 ms; Availability 99.9%/mo.  
- **Subscriptions** — Server→client p95 ≤ 250 ms.  
- **Neo4j Graph Ops** — 1‑hop p95 ≤ 300 ms; 2–3 hop p95 ≤ 1,200 ms.  
- **Ingest** — ≥ 1,000 events/s/pod; processing p95 ≤ 100 ms pre‑storage.

### Observability Plan
- Prometheus histograms + RED metrics; exemplars → traces.  
- Burn‑rate alerts: fast (5m/1h) & slow (1h/6h).  
- Dashboards: Gateway, NLQ/Cypher, ER queue, Cost.

### Security & Privacy
- WebAuthn step‑up on `@sensitive` mutations; session→credential binding.  
- OPA policies: retention tiers, purpose tags, license/TOS enforcement.  
- Default retention: **standard‑365d**; PII → **short‑30d** unless **legal‑hold**.

### Provenance & Audit
- Verify‑Bundle mandatory in CD; cosign attestations; SLSA trust policy.  
- Evidence bundles attached to releases with checksums + chain of custody.

---

## Snippets (ready‑to‑drop)

<details>
<summary>PrometheusRule — Burn‑Rate Alerts (Gateway)</summary>

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
</details>

<details>
<summary>k6 Load (Gateway Reads, 2× RPS)</summary>

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: __ENV.VUS || 50,
  duration: __ENV.DURATION || '10m',
  thresholds: {
    http_req_duration: ['p(95)<350', 'p(99)<900'],
  },
};

const PQ = 'f3a1c6...'; // persisted query hash

export default function () {
  const res = http.post(__ENV.URL, JSON.stringify({
    operationName: 'GetEntity',
    extensions: { persistedQuery: { version: 1, sha256Hash: PQ } },
    variables: { id: 'G123' },
  }), { headers: { 'Content-Type': 'application/json' }});
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(0.1);
}
```
</details>

<details>
<summary>GraphQL Schema — Sensitive Directive</summary>

```graphql
directive @sensitive on FIELD_DEFINITION

type Mutation {
  mergeEntity(input: MergeInput!): MergeResult @sensitive
}
```
</details>

<details>
<summary>CD Guard — Verify‑Bundle Required Check</summary>

```yaml
jobs:
  verify-bundle:
    uses: ./.github/workflows/cd-guardrails.yml
    with:
      require-verify-bundle: true
```
</details>

---

## Evidence Bundle (to deliver at sprint end)
- `evidence/perf/`: k6 reports, Grafana exports, trace exemplars.  
- `evidence/er/`: throughput, lag, DLQ metrics + replay logs.  
- `evidence/policy/`: OPA decision logs, explains, CI artifacts.  
- `evidence/security/`: WebAuthn step‑up logs, rotation receipts.  
- `evidence/provenance/`: tamper tests, attestations, checksums.  
- `evidence/cost/`: cost diffs, sampling configs.  
- `runbooks/`: freeze + DR drill notes (RTO/RPO), sign‑offs.

---

## Release Plan (Week‑by‑Week)
**Week 1:** Perf + policy in staging; provenance/CD gating on; ER load test; tracing cost tune.  
**Week 2:** DR/freeze drills; security step‑up enforcement; GA RC → staging canary → prod cut (if budgets healthy).

---

## Approvals
- **Eng Mgr** (scope & resourcing)  
- **SRE Lead** (SLOs, alerts, runbooks)  
- **AppSec** (step‑up & audit)  
- **Platform TL** (policy & data)  
- **PM/CTO** (go/no‑go)


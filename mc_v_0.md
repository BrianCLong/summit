# Conductor Summary (Go/No‑Go)

**Goal.** Execute the approved MC v0.3+ expansion: scale from 3 → 5 tenants and run a Tier‑3 scoped‑autonomy pilot on **TENANT_001**, with evidence‑backed safety controls, budget/SLO gates, and validated rollback.

**Assumptions.**
- All artifacts listed in your message exist and passed pre‑merge gates.
- Tenants 004/005 provisioned with regional tags and residency policies.
- Scripts available in release image: `tenant_readiness_check.sh`, `aa_expansion_rollout.sh`, `autonomy_pilot.sh`.

**Constraints.**
- Org SLOs & guardrails apply (read p95 ≤ 350 ms, write p95 ≤ 700 ms; monthly 99.9% API availability; cost alerts @ 80%).
- Error budget: API/GraphQL ≤0.1% monthly; Ingest ≤0.5%.

**Risks.** Cache‑warming drift on TENANT_004; pilot autonomy compensation >0.5%; residency mis‑tags; replication lag >60s.

**Definition of Done.**
- TENANT_004/005 live; Wave A→B executed; 14‑day green persists; evidence bundle `v0.3.1-mc` contains GA Delta Report + DR drill link; QI Catalog v1 pinned; privacy tiles live in admin Grafana; autonomy pilot meets ≥99.9% autonomy and ≤0.5% compensation over observation window.

---

## Execution Timeline (Absolute Dates)
- **Week 0 (Readiness & Evidence):** **Sep 29 – Oct 5, 2025**
- **Weeks 1–2 (Wave A + Pilot Start):** **Oct 6 – Oct 19, 2025**
- **Weeks 3–4 (Wave B + Weekly Pilot Reviews):** **Oct 20 – Nov 2, 2025**
- **Week 5 (Decision & Evidence Bundle):** **Nov 3 – Nov 9, 2025**

> If readiness is already green, the Wave A window can begin as early as Oct 6, 2025, preserving observation periods.

---

## Go/No‑Go Checklist (Run‑of‑Show)

### T‑60 min — Pre‑flight
- [ ] `tenant_readiness_check.sh --tenant TENANT_004 --window 14d --slo 0.994` → **PASS**
- [ ] Cache warm plan applied (`/warmup/keys`, top‑N MV refresh) for TENANT_004
- [ ] Prometheus rules + Grafana dashboard revisions loaded (IDs noted below)
- [ ] OPA policies synced; residency & purpose‑tag simulations = **PASS**
- [ ] Canary toggle staged: 2% → 10% → 25% traffic steps (per region)

### T‑0 — Wave A Start (TENANT_004)
- [ ] `aa_expansion_rollout.sh --wave A --tenant TENANT_004 --canary 0.02 --region $PRIMARY` → **START**
- [ ] Observe tripwires (error budget, lag, residency) for 45 min; then ramp 10% → 25% → 50% → 100% with 15‑min soak per step
- [ ] Evidence capture: attach logs, traces, SLO snapshots to `evidence-integration-plan.json` pointers

### T+1–2 weeks — Pilot Start (TENANT_001)
- [ ] `autonomy_pilot.sh enable --tenant TENANT_001 --scope read-only-derived --simulate 60m` (counterfactual)
- [ ] `autonomy_pilot.sh enact --tenant TENANT_001 --approval-token $TOKEN` (after simulation delta <0.5%)
- [ ] Schedule weekly pilot review (compensation rate, autonomy rate, HITL overrides)

### Weeks 3–4 — Wave B (TENANT_005)
- [ ] `tenant_readiness_check.sh --tenant TENANT_005 --window 14d --slo 0.994` → **PASS**
- [ ] `aa_expansion_rollout.sh --wave B --tenant TENANT_005 --canary 0.02` → ramp as Wave A

### Week 5 — Decision & Evidence
- [ ] Compile `v0.3.1-mc` evidence bundle with GA Delta Report, DR drill schedule
- [ ] Executive summary + recommendation: expand Tier‑3 beyond pilot? adjust guardrails?

---

## Tripwires & Auto‑Rollback (Authoritative)

**Trigger → Action**
- Error budget remaining < **60%** (rolling 24h) → **Auto‑rollback last step**; freeze ramp for 24h; open incident.
- DB replication lag > **60s** for 5m → **Stop ramp**, fail to safe read‑replicas; queue writes; notify on‑call.
- Residency violation (OPA deny) → **Abort op**, generate signed audit event, require HITL override.
- Autonomy compensation > **0.5%** in 24h → **Throttle autonomy ops** to 25% and re‑enter simulate.

---

## Monitoring & Alerts (Prometheus Rule Snippets)

```yaml
# api-latency-slo.yaml
groups:
- name: api-slo
  interval: 30s
  rules:
  - record: service:request_duration_seconds:p95
    expr: histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket{job="gateway"}[5m])) by (le))
  - alert: ApiP95TooHigh
    expr: service:request_duration_seconds:p95 > 0.35
    for: 10m
    labels: {severity: warning, slo: "reads"}
    annotations:
      summary: "Read p95 over 350ms"
      runbook: "Runbooks/API-Latency.md"

- name: ingest-slo
  rules:
  - alert: IngestErrorBudgetBurn
    expr: (1 - sum(rate(ingest_success_total[1h])) / sum(rate(ingest_total[1h]))) > 0.005
    for: 15m
    labels: {severity: critical}
    annotations: {summary: "Ingest error budget burn >0.5%"}

- name: db-replication
  rules:
  - alert: ReplicaLagHigh
    expr: pg_replica_lag_seconds{tenant=~"TENANT_004|TENANT_005"} > 60
    for: 5m
    labels: {severity: critical}
    annotations: {summary: "Replica lag >60s — tripwire"}
```

**Grafana Tiles (admin board):**
- Privacy Dashboard: QI Catalog v1 tile(s): PI/PHI access by purpose, residency compliance rate, RTBF queue age
- Expansion Watch: per‑tenant API p95/p99, error budget burn, replica lag, cache hit%, autonomy rate, compensation rate, HITL overrides

---

## Observability & Evidence Hooks
- OpenTelemetry spans: add attributes `tenant_id`, `wave`, `autonomy_mode`, `residency_zone`, `approval_token_id`.
- Log markers for decisions: `DECISION_GO`, `DECISION_ROLLBACK`, `HITL_OVERRIDE` with SHA‑256 evidence IDs.
- Evidence bundler: emit manifest `{source→artifact}` with hashes into `v0.3.1-mc/evidence/`.

---

## Security, Privacy, and Policy
- **ABAC/OPA:** Evaluate policies offline with simulation before apply; attach decision logs to provenance ledger.
- **Purpose limitation:** Tag new data flows with `purpose` (`investigation|threat-intel|...`) per defaults; deny if missing.
- **Retention:** Default `standard-365d`; PII short‑30d unless `legal-hold`; confirm per‑tenant overrides.
- **Encryption:** Field‑level for sensitive attributes; enforce mTLS; rotate tokens for pilot approval path.

---

## Runbooks

### Rollback (Any Wave)
1) `aa_expansion_rollout.sh rollback --tenant <ID> --to <percent|prev>`
2) Drain canary pods; revert traffic; clear feature flags.
3) Trigger cache invalidate + warm baseline set.
4) Capture incident notes; attach to evidence bundle.

### Residency Violation
1) Block writes via OPA deny; isolate offending pipeline.
2) Generate signed audit event; notify DPO.
3) Rehydrate from last compliant snapshot; replay with corrected residency tag.

### Autonomy Drift
1) `autonomy_pilot.sh simulate --tenant TENANT_001 --window 24h --compare production`.
2) If delta >0.5%, auto‑throttle and open task for rules/feature update.

---

## Test Plan (Acceptance & Ongoing)

**Unit/Contract**
- GraphQL persisted queries: schema diff must be empty; contracts for tenant‑scoped ABAC enforced.
- OPA policy tests: residency and purpose‑tag allow/deny matrices.

**E2E (Playwright skeleton)**
```ts
import { test, expect } from '@playwright/test';

const TENANTS = ['TENANT_004','TENANT_005'];

for (const t of TENANTS) {
  test(`tenant ${t} — p95 under SLO`, async ({ request }) => {
    const start = Date.now();
    const res = await request.post('/graphql', { data: { query: '{ health { status } }' } });
    expect(res.ok()).toBeTruthy();
    const dur = Date.now() - start;
    expect(dur).toBeLessThan(350);
  });
}
```

**Load (k6 slice)**
```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 200, duration: '15m', thresholds: { http_req_duration: ['p(95)<350'] } };

export default function() {
  const res = http.post(`${__ENV.GATEWAY}/graphql`, JSON.stringify({query:'{ health { status } }'}), { headers: { 'Content-Type': 'application/json', 'x-tenant-id': __ENV.TENANT } });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(0.2);
}
```

**DB & Graph Checks**
- SQL: `select tenant_id, sum(errors) from api_request_errors where ts > now()-interval '1 hour' group by 1;`
- Cypher: `MATCH (t:Tenant {id:$tenant})-[:OWNS]->(n) RETURN count(n) AS assetCount;`

---

## RACI & Backlog Deltas
- **Run Commander (GO/NO‑GO):** MC (you)
- **Release Eng:** Owns canary/traffic; executes scripts.
- **SRE:** Monitors SLOs; handles rollback & lag; maintains Prometheus rules.
- **Security/Privacy:** Validates OPA, retention, residency; owns DPO notifications.
- **Data Eng:** Cache warming/materialized views; graph refresh.
- **PM/Exec:** Sign off Week 5 decision memo.

_Backlog Adds (must‑have before Wave B):_
- [ ] TENANT_004 cache warming profile tuned; hit% ≥ 92% under P95 target.
- [ ] Autonomy pilot weekly review notes template committed to evidence bundle.

---

## API & Schema Contracts (Slices)
- GraphQL: Persisted queries for tenant‑scoped reads; pagination at 250 rows; backpressure headers.
- Ingest: HTTP streaming ≥1000 events/s per pod; retry/backoff with idempotency keys.

---

## Release Notes (Template)
- Version: v0.3.1‑mc
- Highlights: +2 tenants; T3 pilot enabled (TENANT_001)
- SLO Summary: reads p95/p99, writes p95/p99, subs latency
- Incidents/Tripwires: none | summary
- Evidence: GA Delta Report, DR Drill schedule, privacy dashboard links

---

## Commands (Copy/Paste)
```
# Wave A
./aa_expansion_rollout.sh --wave A --tenant TENANT_004 --canary 0.02 --region $PRIMARY --soak 15m

# Wave B
./aa_expansion_rollout.sh --wave B --tenant TENANT_005 --canary 0.02 --region $PRIMARY --soak 15m

# Autonomy Pilot
./autonomy_pilot.sh enable --tenant TENANT_001 --scope read-only-derived --simulate 60m
./autonomy_pilot.sh enact --tenant TENANT_001 --approval-token $TOKEN
./autonomy_pilot.sh status --tenant TENANT_001 --window 24h --metrics autonomy,compensation,hitl

# Readiness
./tenant_readiness_check.sh --tenant TENANT_004 --window 14d --slo 0.994
./tenant_readiness_check.sh --tenant TENANT_005 --window 14d --slo 0.994
```

---

## Decision Memo (Week 5) — One‑Pager Outline
- KPI table (autonomy %, compensation %, error budget burn, residency incidents, cost vs. guardrail)
- Recommendation (proceed / hold / roll back scope)
- Changes proposed (policy thresholds, cache strategy, regional routing)
- Sign‑offs (MC, SRE, Security/Privacy, PM/Exec)

---

**Ready for execution.** This packet is your single source for run‑of‑show, monitoring, rollback, and evidence capture for the MC v0.3+ expansion.


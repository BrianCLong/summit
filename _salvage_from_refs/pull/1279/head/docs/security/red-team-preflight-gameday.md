# Sprint 26 GA Cutover — Red Team Preflight & Game Day Plan

Date: September 17, 2025 (America/Denver)
Scope: GA cutover for prod with canary → progressive ramp; automated gates (G1–G8) + manual G8; cost guardrails; DR rehearsal; mission control ops.
Audience: War Room leads, SRE, SecEng, Platform, App Eng, Comms/Support, Finance.

---

## 1) Executive Summary (Go/No-Go Lens)

You’ve shipped a production-ready framework. This plan adds a preflight hardening layer, decision hygiene, and failure-mode playbooks to shrink MTTR and de-risk irreversible states.

Primary Go/No-Go augmentations
- Add G9–G12 gates (Privacy/Data, IAM/Breakglass, Data-Migration/Backfill, Third‑Party/LLM cost spike) with crisp pass/fail.
- Introduce 1% “micro‑canary” stage before 5% to observe tail latency & auth edge cases.
- Codify rollback hysteresis & cool‑down to prevent oscillation.
- Freeze nonessential changes; make configs immutable during ramp; pre‑stage all feature flags with off-by-default fallback.
- Define blast-radius containment (request routing + service allow-lists) for each stage.

---

## 2) Gate Augmentations (G9–G12)

Append to `tools/igctl/go-no-go-matrix.yaml`.

G9: Privacy & Data Protection Controls
- Objective: Ensure GA does not regress privacy commitments (DPA, regional routing, data retention).
- Signals: DSAR p95 ≤ 500ms (p99 ≤ 900ms); residency match rate 100%; DLP Info+ = 0 in last 60m.
- Validation: `igctl cutover go-no-go --gate G9` (DLP + residency audit).
- Decision: Fail on any Info+ finding or residency mismatch.

G10: IAM & Breakglass
- Objective: Prove incident access can be established without weakening baseline.
- Signals: WebAuthn step‑up success ≥ 99%; SA auth paths valid; breakglass time‑boxed ≤ 60m + audited.
- Validation: `igctl drill rehearse --env prod --scenario iam-breakglass`.
- Decision: Fail on any blocked path or missing audit.

G11: Data Migration & Backfill Safety
- Objective: Guard against partial writes, dual‑write drift, or irreversible schema bumps.
- Preconditions: Idempotent/N‑1 compatible 24h; shadow reads delta < 0.1% p95.
- Validation: binomial test over 10k records; diff < 0.1%.
- Decision: Fail if incompatibility or diff ≥ threshold.

G12: Third‑Party / LLM Cost & Rate‑Limit Health
- Objective: Detect cascading failures from vendor throttling or cost spikes.
- Signals: External 429/5xx < 0.2%; vendor p95 < 800ms; LLM cost/min within band; spike < 2× for 10m; headroom ≥ 20%.
- Validation: synthetic probes + headroom check.
- Decision: Fail on sustained breach or < 20% headroom.

---

## 3) Canary & Ramp Profile

Stages: 1% → 5% → 25% → 50% → 100%
Stage dwell: min 20m or 3× sliding SLO windows.
Blast radius: per‑stage allow‑lists + sticky routing.

Commands
```bash
igctl cutover execute \
  --strategy canary --stages 1,5,25,50,100 \
  --dwell-min 20m --hysteresis 10m \
  --auto-rollback --sticky-routing --freeze-configs

igctl cutover go-no-go --validate-all
igctl cutover go-no-go --gate G9 --gate G10 --gate G11 --gate G12
```

Rollback (hysteresis + cool‑down)
- Trigger met → hold 5m → rollback within 10m.
- Cool‑down 30m post‑rollback; manual ack + hypothesis before retry.

---

## 4) Observability: SLOs, PromQL, Alerts

Golden signals: latency (p95/p99), error rate, saturation, cost/min, auth success, OPA latency cache‑hit.

PromQL snippets
```promql
sum by (service)(rate(http_requests_total{env="prod",le!=""}[5m]))
  / sum by (service)(rate(http_requests_total{env="prod",status=~"5..|4.."}[5m]))

histogram_quantile(0.95, sum by (le,service)(rate(http_request_duration_seconds_bucket{env="prod"}[5m])))

histogram_quantile(0.95, sum by (le,operation)(rate(graphql_duration_seconds_bucket{env="prod",op_type="read"}[5m])))

histogram_quantile(0.95, sum by (le)(rate(opa_decision_duration_seconds_bucket{env="prod"}[5m])))

max_over_time(error_ratio[2m]) / 0.001 > 14 or max_over_time(error_ratio[1h]) / 0.001 > 6

sum by (vendor)(rate(llm_cost_cents_total{env="prod"}[1m]))
```

Alert routing
- P0: Slack #war‑room + PagerDuty (SRE on‑call) + SMS to IC.
- P1/P2: Slack + PagerDuty; email for leads.
- Auto‑actions: if burn_rate > 6%/h for 10m and latency_p95 > 30% → `igctl cutover rollback --to last-stable --confirm`.

---

## 5) Performance Validation (k6)

Load model: steady + spike 1.5×; mixed R/W 80/20.
Checks: GraphQL read p95 ≤ 350ms; write p95 ≤ 700ms; Neo4j 1‑hop p95 ≤ 300ms; OPA p95 ≤ 25ms, cache‑hit ≥ 85%; p99.9 < 2× p95.

Runner
```bash
k6 run perf/canary_smoke.js --out influxdb=http://prometheus:8086 \
  --tag stage=canary --vus 200 --duration 20m
```
Gate
```
tools/igctl/gate-validator.sh --k6-report perf/k6_out.json --threshold-file perf/thresholds.json
```

---

## 6) Cost Guardrails (Downshift Ladder)

Budgets: Infra $18k/day, LLM $5k/day; window 5m; 3/5 rule.

| Tier | Trigger | Action | SLO |
| --- | --- | --- | --- |
| 1 | spend/min > +20% | reduce sampling 10% | none |
| 2 | > +40% | disable non‑critical enrichers | minimal |
| 3 | > +60% | cap LLM parallelism; batch +50% | low |
| 4 | > +100% | throttle optional endpoints; cache TTL +2× | moderate |
| 5 | > +150% or vendor 429 >0.5% | circuit‑break premium features | notable |
| 6 | > +200% or spike 3× | Emergency mode; scale floors | high |

Commands
- `igctl cost downshift --tier N --reason "LLM spike"`
- `igctl cost resume --guarded`

---

## 7) Security & Policy Readiness

- WebAuthn: success ≥ 99%; failures < 1%; fallback for service accounts.
- OPA: warm caches top‑100; shadow‑deny logs; SLO p95 < 25ms.
- SLSA‑3: verify all artifacts; block unverifiable digests.

Verification
```bash
igctl security verify --provenance slsa3 --artifacts @release_manifest.json
igctl policy warm --top 100 --target prod && igctl policy check --mode shadow
```

---

## 8) Communications Matrix

| Scenario | Channel | SLA | Owner |
| --- | --- | --- | --- |
| Planned GA start | Status Page + Slack #eng‑all + Email | T‑30m | Comms |
| Stage advance | War Room update card | ≤ 2m | IC |
| Guardrail downshift | Status Page (maintenance note) | ≤ 5m | FinOps |
| Rollback | Status Page + PagerDuty | ≤ 2m | IC |
| DR rehearsal kickoff | Slack + Email | T‑0 | DR Lead |

---

## 9) DR Rehearsal & Failback

RPO: 5m; RTO: 60m. Promote only if health ≥ 99% over last 10m; failback requires <0.1% diff over 15m and fresh backups.

```bash
igctl drill rehearse --env prod --rpo-target 5m --rto-target 60m --verify-failback
```

---

## 10) War Room Roles (RACI)

- Incident Commander: final Go/No-Go; approves rollback.
- SRE Lead: executes igctl; infra SLOs.
- App Lead: GraphQL/Neo4j perf + errors.
- Sec Lead: WebAuthn, OPA, SLSA.
- FinOps: budgets & downshift.
- Comms: status messaging.

---

## 11) Timeline Checklist (Print‑Ready)

T‑72h: Freeze nonessential; tag release; cutover brief; pass G1–G8 in pre‑prod.
T‑24h: Snapshots; restore drills; preload OPA cache; WAF monitor mode.
T‑12h: On‑call coverage; dashboards pinned; status draft queued.
T‑1h: `igctl cutover go-no-go --validate-all`; arm guardrails; lock configs.
T‑0: 1% micro‑canary → dwell 20m → advance if green.
T+stage: Evaluate gates; adjust blast radius; comms.
T+GA: Stability soak 2h; rollback ready; customer update.

---

## 12) Failure‑Mode Playbooks (Quick Cards)

A) Latency Spike (>30%/15m): scale reads; cache TTL↑; shed non‑critical; rollback if persists.
B) Burn > 6%/h (10m): classify errors; vendor? downshift Tier ≥3; rollback if unknown.
C) WebAuthn Pockets: regional fallback; waive for trusted device 60m; monitor fraud.
D) OPA p95 > 25ms: warm cache; prefetch bundles; coarse allow for read-only 15m; rollback if write blocked.
E) LLM Cost 3×: emergency mode; batch async; cached responses.

---

## 13) Evidence Capture & Post‑GA

Export igctl decisions, gates, alerts, k6, provenance to immutable storage. Post‑GA 72h review: SLOs, cost, security, tickets; assign follow‑ups.

```bash
igctl export \
  --decisions --gates --alerts --k6-report --provenance \
  --out s3://ops-artifacts/ga-2025-09-17/
```

---

## 14) Appendices

A) Sample go-no-go-matrix additions (G9–G12): see tools/igctl/go-no-go-extensions.yaml
B) War‑Room Board Columns: `Stage | Gates | SLO | Cost Tier | Incidents | Decision | ETA | Owner`
C) Glossary: Hysteresis, Cool‑down, Shadow read/deny

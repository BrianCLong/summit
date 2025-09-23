# Sprint 26 GA Cutover — Red Team Preflight & Game Day Plan

**Date:** September 17, 2025 (America/Denver)  
**Scope:** GA cutover for prod with canary → progressive ramp; automated gates (G1–G8) + manual G8; cost guardrails; DR rehearsal; mission control ops.  
**Audience:** War Room leads, SRE, SecEng, Platform, App Eng, Comms/Support, Finance.

---
## 1) Executive Summary (Go/No-Go Lens)
You’ve shipped a production-ready framework. This plan adds a **preflight hardening layer**, **decision hygiene**, and **failure-mode playbooks** to shrink MTTR and de-risk irreversible states.

**Primary Go/No-Go augmentations**
- Add **G9–G12** gates (Privacy/Data, IAM/Breakglass, Data-Migration/Backfill, Third‑Party/LLM cost spike) with crisp pass/fail.
- Introduce **1% “micro‑canary”** stage before 5% to observe tail latency & auth edge cases.
- Codify **rollback hysteresis** & **cool‑down** to prevent oscillation.
- Freeze nonessential changes; make configs **immutable** during ramp; pre‑stage all feature flags with **off-by-default** fallback.
- Define **blast-radius containment** (request routing + service allow-lists) for each stage.

---
## 2) Gate Augmentations (G9–G12)
> Keep G1–G8 as delivered. Append the following to `tools/igctl/go-no-go-matrix.yaml`.

**G9: Privacy & Data Protection Controls**
- **Objective:** Ensure GA does not regress privacy commitments (DPA, regional routing, data retention).  
- **Signals:**
  - DSAR endpoints p95 ≤ **500ms**; 99th ≤ **900ms** (read/write).  
  - Regional data residency policy match rate **= 100%** for all prod requests.  
  - PII/PHI DLP detectors: **0 findings** at Info+ severity in the last **60m** during canary.  
- **Validation:** `igctl cutover go-no-go --gate G9` (runs DLP sampling + residency audit).  
- **Decision:** **Fail** on any Info+ finding or residency mismatch.

**G10: IAM & Breakglass**
- **Objective:** Prove incident access can be established without weakening baseline.  
- **Signals:**  
  - WebAuthn step‑up success **≥ 99%** for human SRE.  
  - **Service account** auth paths validated (no interactive WebAuthn dependencies).  
  - Breakglass role **time‑boxed** (≤ 60m), MFA enforced, audit log generated.  
- **Validation:** `igctl drill rehearse --env prod --scenario iam-breakglass` (simulated P0).  
- **Decision:** **Fail** if any path blocked or audit trail missing.

**G11: Data Migration & Backfill Safety**
- **Objective:** Guard against partial writes, dual‑write drift, or irreversible schema bumps.  
- **Preconditions:**  
  - Migration is **idempotent**, re‑entrant, and **N‑1 compatible** for **24h**.  
  - **Shadow reads** from new path match legacy within **0.1%** delta at p95.  
- **Validation:** binomial test over **10k** sampled records; diff < **0.1%**.  
- **Decision:** **Fail** if schema incompatibility or diff ≥ threshold.

**G12: Third‑Party / LLM Cost & Rate‑Limit Health**
- **Objective:** Detect cascading failures from vendor throttling or cost spikes.  
- **Signals:**  
  - External 429/5xx rate < **0.2%**; vendor latency p95 < **800ms**.  
  - LLM cost/minute within budget band; spike < **2×** for **10m** window.  
- **Validation:** synthetic probes + rate‑limit headroom ≥ **20%**.  
- **Decision:** **Fail** on sustained breach or <20% headroom.

---
## 3) Canary & Ramp Profile
**Stages:** 1% → 5% → 25% → 50% → 100%  
**Stage dwell:** minimum **20m** or **3×** sliding windows of SLOs, whichever longer.  
**Blast radius:** per‑stage **allow‑lists** (accounts, regions) + **sticky routing**.

**Commands**
```bash
# Micro‑canary
igctl cutover execute \
  --strategy canary --stages 1,5,25,50,100 \
  --dwell-min 20m --hysteresis 10m \
  --auto-rollback --sticky-routing --freeze-configs

# Full gates
igctl cutover go-no-go --validate-all
igctl cutover go-no-go --gate G9 --gate G10 --gate G11 --gate G12
```

**Rollback policy (hysteresis + cool‑down)**  
- Trigger met → **hold for 5m** (confirm persistence) → rollback to last stable within **10m**.  
- Post‑rollback **cool‑down 30m** before re‑attempt; require manual ack + root‑cause hypothesis.

---
## 4) Observability: SLOs, PromQL, and Alerts
**Golden signals:** latency (p95/p99), error rate, saturation, cost/min, auth success, OPA latency cache‑hit.

**PromQL snippets**
```promql
# HTTP request rate & error ratio (global)
sum by (service)(rate(http_requests_total{env="prod",le!=""}[5m]))
  /
sum by (service)(rate(http_requests_total{env="prod",status=~"5..|4.."}[5m]))

# p95 latency (Histogram)
histogram_quantile(0.95, sum by (le,service)(rate(http_request_duration_seconds_bucket{env="prod"}[5m])))

# GraphQL read/write segregated
ihistogram_quantile(0.95, sum by (le,operation)(rate(graphql_duration_seconds_bucket{env="prod",op_type="read"}[5m])))

# OPA decision latency p95
histogram_quantile(0.95, sum by (le)(rate(opa_decision_duration_seconds_bucket{env="prod"}[5m])))

# Error budget burn (multi‑window multi‑burn)
max_over_time(error_ratio[2m]) / 0.001 > 14  or  max_over_time(error_ratio[1h]) / 0.001 > 6

# LLM spend per minute
sum by (vendor)(rate(llm_cost_cents_total{env="prod"}[1m]))
```

**Alert routing**
- **P0:** Slack #war‑room + PagerDuty (SRE on‑call) + SMS to Incident Commander.  
- **P1/P2:** Slack + PD; email for leads.  
- **Auto‑actions:** if `burn_rate > 6%/h for 10m` **and** `latency_p95 > 30%` → `igctl cutover rollback --to last-stable --confirm`.

---
## 5) Performance Validation (K6)
**Load model:** baseline P50, P95 steady states + spike 1.5×; think‑time realism; GraphQL mixed R/W 80/20.

**Key checks**
- GraphQL read p95 ≤ **350ms**; write p95 ≤ **700ms**.  
- Neo4j 1‑hop p95 ≤ **300ms**.  
- OPA p95 ≤ **25ms** with **cache‑hit ≥ 85%**.  
- Tail (p99.9) < **2×** p95.

**Runner**
```bash
k6 run perf/canary_smoke.js --out influxdb=http://prometheus:8086 \
  --tag stage=canary --vus 200 --duration 20m
```

**Automated parse gate**  
`tools/igctl/gate-validator.sh --k6-report perf/k6_out.json --threshold-file perf/thresholds.json`

---
## 6) Cost Guardrails (Downshift Ladder Spec)
**Budgets:** Infra **$18k/day**, LLM **$5k/day**  
**Evaluation window:** 5m sliding; **3/5** breach rule to mitigate noise.

| Tier | Trigger | Action | SLO Impact |
|---|---|---|---|
| 1 | spend/min > baseline +20% | reduce sampling 10% | none |
| 2 | > +40% | disable non‑critical enrichers | minimal |
| 3 | > +60% | cap LLM parallelism; batch window +50% | low |
| 4 | > +100% | throttle optional endpoints; cache TTL +2× | moderate |
| 5 | > +150% or vendor 429 >0.5% | circuit‑break premium features | notable |
| 6 | > +200% or spike 3× | **Emergency mode**: essential endpoints only; autoscale floor to Nmin | high |

**Command hooks**  
- `igctl cost downshift --tier N --reason "LLM spike"`  
- `igctl cost resume --guarded`

---
## 7) Security & Policy Readiness
- **WebAuthn:** pre‑flight **success ≥ 99%**; track **<1%** step‑up failures by tenant; ensure fallback for **service/robots**.  
- **OPA:** warm caches with top‑100 policies; enforce **shadow‑deny** logging; SLO p95 < **25ms**.  
- **SLSA‑3:** provenance verify across all artifacts; blocker on any unverifiable digest; store attestations in transparency log.

**Verification**
```bash
igctl security verify --provenance slsa3 --artifacts @release_manifest.json
igctl policy warm --top 100 --target prod && igctl policy check --mode shadow
```

---
## 8) Communications Matrix (Templates wired to automation)
| Scenario | Channel | SLA | Owner |
|---|---|---|---|
| Planned GA start | Status Page + Slack #eng‑all + Email customers | T‑30m | Comms Lead |
| Stage advance | War Room update card | ≤ 2m after advance | IC |
| Guardrail downshift | Status Page (maintenance note) | ≤ 5m | FinOps |
| Rollback | Status Page (incident) + PagerDuty | ≤ 2m | IC |
| DR rehearsal kickoff | Slack + Email | T‑0 | DR Lead |

---
## 9) DR Rehearsal & Failback
- **RPO:** 5m; **RTO:** 60m.  
- Pre‑validate replica lag < **90s**; promote only if **health ≥ 99%** over last **10m**.  
- **Failback** requires dual‑write consistency proof (<0.1% diff over 15m) and fresh backups.

**Commands**
```bash
igctl drill rehearse --env prod --rpo-target 5m --rto-target 60m --verify-failback
```

---
## 10) War Room Roles & Decision Authority (RACI)
- **Incident Commander (IC):** final Go/No-Go; approves rollback.  
- **SRE Lead:** executes igctl; owns infra SLOs.  
- **App Lead:** owns GraphQL/Neo4j perf + error rates.  
- **Sec Lead:** WebAuthn, OPA, SLSA attestations.  
- **FinOps:** budgets & downshift.  
- **Comms Lead:** status page and stakeholder messaging.

---
## 11) T‑Timeline Checklist (Print‑Ready)
**T‑72h**  
- Freeze nonessential changes; tag release; publish cutover brief.  
- Pass G1–G8 pre‑prod; dry‑run gates G9–G12 in staging with prod parity.

**T‑24h**  
- Snapshot backups; verify restore drills; preload OPA cache; WAF rules in monitor mode.

**T‑12h**  
- Validate on‑call coverage; health dashboards pinned; status page draft queued.

**T‑1h**  
- Run `igctl cutover go-no-go --validate-all`; confirm cost guardrails armed; set config immutability.

**T‑0**  
- Execute 1% micro‑canary; dwell 20m; evaluate SLOs & burn rate; advance if green.

**T+30m / per stage**  
- Re‑run gates subset (latency, errors, OPA, cost); communicate progress; adjust blast radius.

**T+GA**  
- Run **stability soak 2h**; keep rollback ready; publish customer update.

---
## 12) Failure‑Mode Playbooks (Quick Cards)
**A) Latency Spike (>30% for 15m)**  
- Check: saturation (CPU/mem), DB queue depth, cache hit rate.  
- Actions: scale read replicas; increase cache TTL; shed non‑critical traffic; if persists 10m → rollback.

**B) Error Budget Burn > 6%/h for 10m**  
- Check error class; if 5xx from dependency → engage vendor; downshift Tier 3+.  
- If unknown → rollback, capture traces.

**C) WebAuthn Failure Pockets**  
- Enable regional fallback; waive step‑up for trusted device for **60m**; monitor fraud signals.

**D) OPA p95 > 25ms**  
- Warm cache; enable policy bundle prefetch; fall back to coarse‑grained allow for read‑only paths for **15m**; rollback if write paths blocked.

**E) LLM Cost Spike 3×**  
- Tier 6 emergency: essential endpoints only; batch async jobs; switch to cached responses.

---
## 13) Evidence Capture & Post‑GA
- Export all igctl decisions, gate results, alerts to immutable storage.  
- 72h **post‑GA review**: SLO adherence, cost variance, security events, customer tickets; follow‑ups with owners & dates.

**Artifacts export**
```bash
igctl export \
  --decisions --gates --alerts --k6-report --provenance \
  --out s3://ops-artifacts/ga-2025-09-17/
```

---
## 14) Appendices
**A) Sample `go-no-go-matrix.yaml` additions (G9–G12)**  
YAML schema with thresholds and validators (inline comments indicate rationales).  

```yaml
- id: G9
  name: PrivacyAndData
  thresholds:
    dsar_p95_ms: 500
    dsar_p99_ms: 900
    residency_match_rate: 1.0
    dlp_info_or_higher: 0
  validators:
    - type: dsar-probe
    - type: residency-audit
    - type: dlp-sample
  decision: fail_on_any_breach

- id: G10
  name: IamBreakglass
  thresholds:
    webauthn_success_rate: 0.99
    breakglass_window_minutes: 60
  validators:
    - type: webauthn-synthetic
    - type: sa-auth-check
    - type: audit-log-verify
  decision: fail_on_any_breach

- id: G11
  name: DataMigrationSafety
  thresholds:
    diff_ratio_max: 0.001
    n1_compatibility_hours: 24
  validators:
    - type: shadow-read-compare
    - type: schema-compat-check
  decision: fail_on_any_breach

- id: G12
  name: ThirdPartyCostHealth
  thresholds:
    vendor_error_ratio_max: 0.002
    vendor_latency_p95_ms: 800
    llm_spike_multiplier_max: 2
    headroom_min: 0.2
  validators:
    - type: vendor-probe
    - type: cost-anomaly
    - type: ratelimit-headroom
  decision: fail_on_any_breach
```

**B) War‑Room Board Columns**  
`Stage | Gates | SLO | Cost Tier | Incidents | Decision | ETA | Owner`  

**C) Glossary**  
- **Hysteresis:** buffer to avoid flapping decisions.  
- **Cool‑down:** time before re‑attempting after rollback.  
- **Shadow read/deny:** observe decisions without enforcement.


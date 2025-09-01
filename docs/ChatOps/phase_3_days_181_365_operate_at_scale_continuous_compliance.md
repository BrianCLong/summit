# Phase 3 (Days 181–365): Operate at Scale & Continuous Compliance

**Intent:** We have a battle‑tested pipeline. Now we standardize excellence, scale safely, and stay audit‑ready by default.

---

## North‑Star Targets (Sustain & Scale)
- **DORA**: Lead time ≤ 12h P75; deploy frequency ≥ 2/day; change‑failure ≤ 8%; MTTR ≤ 20m P75.
- **Reliability**: All tier‑1 services with 3+ SLOs; error‑budget policies enforced; SLO burn auto‑rollback everywhere.
- **Security**: SLSA L3+ evidence for every release; zero criticals; quarter‑over‑quarter mean vulnerability age ↓ 50%.
- **Resilience**: Regional failover validated; RPO ≤ 5m, RTO ≤ 20m; quarterly full restore.
- **Cost**: p95 cost-to-serve per request flat or ↓ 10% QoQ.

---

## Workstreams

### 1) Evidence‑Driven Operations (Audit Autopilot)
- **Deliverables**
  - Release **Evidence Packs** generated per tag: SBOM, attestations, scan reports, policy decisions, approvers, canary metrics, rollback logs.
  - **Immutable artifact ledger** (transparency log) with retention & export.
  - **Control library** mapping (SOC2/ISO/SLSA) → automated checks + manual attestations only where automation is impossible.
- **Acceptance**: Sample audit walkthrough completed; 0 findings on 3 random releases.

### 2) Regional Resilience & DR
- **Deliverables**
  - **Active/standby** promotion runbook + automated health gates.
  - Cross‑region data pipelines with **lag monitors** and alerting; chaos scenarios include region impairment.
  - **Quarterly restore rehearsal** into clean account with timed RPO/RTO measurement.
- **Acceptance**: Two consecutive rehearsals under targets; failover drill executed with < 10m operator time.

### 3) Performance Engineering & Cost Excellence
- **Deliverables**
  - **Performance budgets** per endpoint tied to k6 suites; CI fails on regressions.
  - **Demand modeling** + autoscale policies (HPA/VPA) codified; soak tests for 2× traffic.
  - **Cost scorecards** in Backstage; PR **cost‑diff gates** with threshold exceptions via signed change record.
- **Acceptance**: 2× surge without SLO breach; 10% p95 cost reduction QoQ.

### 4) Data Safety Rails & Lifecycle
- **Deliverables**
  - **Backfill orchestration** with idempotency & cancellation; latency budgets for backfills.
  - **DLP policies** (classify, mask, retain, purge) enforced in CI/CD.
  - **Schema compatibility contracts** (forward/backward) verified against production traffic samples.
- **Acceptance**: Zero production incidents attributed to migrations/backfills over 90 days.

### 5) Platform Paved Road at Scale
- **Deliverables**
  - Backstage **service scorecards**: SLOs, dashboards, runbooks, on‑call, cost owner, security owner, threat model.
  - **Templates** for primary stacks with built‑in OTEL, budgets, rollout manifests, chaos hooks.
  - **Trunk‑based** enforcement with merge queue + feature flags; preview TTL + idle reap.
- **Acceptance**: ≥ 90% services on paved road; new service to prod in ≤ 1 workday.

### 6) Human Systems: On‑Call & Incident Mastery
- **Deliverables**
  - **On‑call charter** (pager rotations, escalation, comms tree, severity classes).
  - **Incident templates** (ICS), comms macros, and **5‑Why**/blameless postmortems with action tracking.
  - **Monthly Game Days** escalating in scope; include third‑party brownouts and auth/identity incidents.
- **Acceptance**: Mean rollback < 5m; 100% incidents with postmortems closed in ≤ 10 days.

---

## Execution Waves
- **Wave A (Months 7–8):** Evidence Packs v1, cost scorecards, active/standby drill, k6 perf budgets locked.
- **Wave B (Months 9–10):** Regional failover rehearsal, DLP guardrails, backfill orchestration.
- **Wave C (Months 11–12):** Paved‑road ≥ 90% adoption, audit dry‑run, Game Day triad (region, identity, data).

---

## Weekly/Monthly Rhythm
- **Weekly:** DORA roll‑up; policy denials; SLO burn; top regressions; cost diffs; open actions from postmortems.
- **Monthly:** Game Day report; DR metric review; paved‑road adoption; vulnerability age; exceptions ledger.

---

## Gate Library v2 (OPA/Conftest Outlines)
- deny if: image lacks attestation; container without requests/limits; no PDB; missing NetworkPolicy; LoadBalancer without `sourceRanges`; privileged or hostPath; policy exception lacks approver & expiry; deployment lacks SLO annotations; rollout lacks canary steps.

---

## Templates & Artifacts (Stubs)
- **Evidence Pack manifest (YAML)**
- **Incident report template (Markdown)**
- **Failover runbook (Markdown)**
- **Backfill job contract (YAML)**

---

## Definition of Done (Phase 3)
- Audit dry‑run passes; two regional failover drills under target; DORA targets sustained 90 days; paved‑road ≥ 90%; zero critical vulns; cost p95 flat or better.


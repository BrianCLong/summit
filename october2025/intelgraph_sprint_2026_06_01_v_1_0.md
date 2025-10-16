# IntelGraph — Sprint 35 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-06-01_v1.0`  
**Dates:** Jun 1–Jun 12, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.06.r1` (flags default OFF → progressive enablement by cohort)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Lock in **Disclosure v2.0 GA**, move Predictive into **continuous mitigation loops**, deliver **Case Spaces M17** (predictive auto‑allocation behind flags), **productionize high‑risk Residency remediations**, and cement **ZK Acceleration steady‑state ops** (or complete post‑mortem if sunset).

**Definition of Victory (DoV):**

- Disclosure v2.0 **GA** launched with ≥99% migration success on real bundles and partner SLAs met.
- Predictive ships **bias mitigation loops** (monitor → recommend → approve/apply → verify) with weekly scorecards auto‑published.
- Case M17 auto‑allocates budget **behind flags** and shows measurable lift on stage A/B tests.
- Residency high‑risk flows promoted to **production** with per‑tenant catalogs and rollback drills green.
- ZK Accel steady‑state dashboards live with cost/SLOs green for the sprint **or** final post‑mortem approved with CI gates restored.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Disclosure: v2.0 GA checklist finalization, partner rollout waves, migration playbooks, GA comms.
- Predictive: continuous mitigation loop (detectors, recommender, what‑if, approval, apply, verify) + registry integration.
- Case M17: **auto‑allocation** engine (flagged), approval/rollback, attribution safety rails.
- Residency: productionize high‑risk flows (catalogs, change windows, staged cutover, revert), per‑tenant policies.
- ZK: steady‑state dashboards (perf/cost), watchdogs, fallback drills; or post‑mortem close‑out.

**Should**

- Cost Model v2.9 (v2 GA ops + continuous mitigation + auto‑allocation + residency production flows + ZK steady‑state).
- Publisher UX polish (what‑if diffs, allocation previews, risk heatmaps).

**Won’t (this sprint)**

- New predictive features; ZK bespoke hardware; non‑curated partner marketplace for Disclosure.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Disclosure **v2.0 GA**

**A1. GA Playbook & Waves**

- Rollout waves, partner comms, rollback plan, trust store updates. (8 pts)
- _Acceptance:_ Wave‑1 partners live; rollback drill PASS; comms artifacted.

**A2. Migration Hardening**

- Close final gaps; migrate ≥99% of v1 variants; long‑tail guidance. (5 pts)
- _Acceptance:_ Coverage report ≥99%; exceptions documented.

**A3. GA Telemetry & SLAs**

- SLOs (verify success/latency); pager rotations; partner SLA dashboard. (3 pts)
- _Acceptance:_ Dash green for week; SLA tests pass.

### Epic B — Predictive **Continuous Mitigation Loop**

**B1. Loop Orchestration**

- Detector → recommender → what‑if → approval → apply → verify; registry hooks. (8 pts)
- _Acceptance:_ Two loops executed end‑to‑end; artifacts attached to scorecards.

**B2. Weekly Auto‑Scorecards**

- Generate and publish weekly fairness/bias scorecards per model. (3 pts)
- _Acceptance:_ Two weeks backfilled; links in release notes.

**B3. Guardrail Monitors & Pauses**

- Auto‑pause on incident; kill‑switch macros. (3 pts)
- _Acceptance:_ Drill pause ≤2m; rollback ≤5m.

### Epic C — Case Spaces **M17 (Auto‑Allocation — Flagged)**

**C1. Allocation Engine**

- Optimize spend/time across audiences; constraints; confidence bands. (8 pts)
- _Acceptance:_ Stage A/B shows lift on at least one campaign.

**C2. Approval & Rollback**

- Review flow, preview diffs, one‑click revert. (3 pts)
- _Acceptance:_ Applied change reverts cleanly.

**C3. Attribution & Safety Rails**

- Ensure attribution integrity; block changes that break redaction/disclosure continuity. (3 pts)
- _Acceptance:_ Violations blocked with reasons; audit recorded.

### Epic D — Residency **Productionization (High‑Risk)**

**D1. Per‑Tenant Catalogs & Windows** (5 pts) — map remediation types to tenants; change windows; blackout rules.  
**D2. Staged Cutover & Revert Playbooks** (5 pts) — DRY‑run diffs; canary; timed revert.  
**D3. Ops Dashboards** (3 pts) — status, approvals, rollbacks, incidents.

### Epic E — ZK **Steady‑State Ops (or Post‑Mortem)**

**E1. Dashboards & Budgets** (5 pts) — p95 verify, throughput, cost/proof, watchdogs.  
**E2. Fallback/Drill Cadence** (3 pts) — weekly drills; CPU fallback proof.  
**E3. Post‑Mortem Close‑out** (3 pts) — if sunset: lessons, CI gates, TCO archive.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Gov/Ops:_ v2 GA waves & SLAs, residency catalogs/cutovers, loop orchestration
- _Trust Fabric:_ ZK steady‑state dashboards/drills, disclosure verify SLOs
- _Graph Core:_ auto‑allocation engine, attribution rails, approval/rollback
- _Copilot/UX:_ what‑if & diffs, allocation previews, partner comms UX
- _QA/Release:_ migration coverage QA, drills, GA playbook execution

**Working Agreements**

- No GA wave without **rollback drill PASS** and **SLA dashboard green**.
- Auto‑allocation runs **behind flags** with **human approval** and **revert path**.
- High‑risk remediations must use **per‑tenant catalogs** and **staged cutovers**.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon Jun 1, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed Jun 3 (45m), Fri Jun 5 (30m).
- **Mid‑Sprint Demo & Risk:** Tue Jun 9 (30m).
- **Rollback Drill:** Thu Jun 11 (20m).
- **Review + Demo:** Fri Jun 12 (60m).
- **Retro:** Fri Jun 12 (30m).

---

## 6) Definition of Ready (DoR)

- Stories ≤8 pts; flags named; cohorts/regions and partners listed; catalogs/windows defined; dashboards wired; privacy notes updated.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; v2 GA wave‑1 launched with rollback/SLA green; mitigation loops running with scorecards; M17 allocation shipped (flagged) with A/B lift; residency high‑risk flows productionized; ZK steady‑state dashboards live (or post‑mortem complete); docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Disclosure:** GA wave drill; migration success ≥99%; SLA probes.
- **Predictive:** loop E2E; pause/rollback drills; weekly scorecards.
- **Case M17:** allocation preview → apply → revert; A/B power calc.
- **Residency:** per‑tenant catalogs; staged cutover; revert drills.
- **ZK:** dashboards; watchdog alerts; CPU fallback proof.

---

## 9) Metrics & Telemetry (Sprint)

- **Disclosure:** migration success, verify success/latency, partner SLA health.
- **Predictive:** loops executed, incidents paused, weekly scorecards published.
- **Case Ops:** allocation adoption, A/B lift, rollback rate.
- **Residency:** remediations executed, approval SLA, rollback success.
- **Trust:** verify p95, fallback drills, cost/proof.
- **Reliability/Cost:** error budget burn, GA/ops cost deltas.

---

## 10) Risks & Mitigations

- **Partner readiness variance** → concierge onboarding; extended monitoring windows.
- **Mitigation loops oscillate** → cool‑downs; human approval; rollback.
- **Allocation misfires** → guardrails, attribution checks, staged rollout.
- **High‑risk remediation blast radius** → per‑tenant catalogs, canary, revert.
- **Dashboards blind spots** → synthetic probes; SLO tests.

---

## 11) Deliverables (Artifacts)

- `docs/` → Disclosure v2 GA playbook; Continuous Mitigation Loop SOP; M17 Auto‑Allocation spec; Residency Productionization SOP; ZK Steady‑State Ops (or Post‑Mortem).
- Dashboards: Disclosure (GA/SLA), Predictive (loops/scorecards), Case Ops (allocation/A‑B), Residency (catalogs/cutovers), Trust (ZK), Reliability/Cost.
- Runbooks: “GA Wave & Rollback”, “Mitigation Loop Ops”, “Allocation Approve/Revert”, “High‑Risk Remediation”, “ZK Drill Cadence”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-DISCLOSURE-2.0-GA`, `EPIC-PRED-MITIGATION-LOOPS`, `EPIC-CASE-M17`, `EPIC-RESIDENCY-PROD`, `EPIC-ZK-STEADY-OPS`  
**Labels:** `disclosure-v2-ga`, `mitigation-loop`, `auto-allocation`, `residency-prod`, `zk-ops`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**

```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:

- [ ] Behavior criteria…
- [ ] Gates/fallbacks validated…
- [ ] Approvals & audit trail attached…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches

```http
POST /disclosure/v2/ga/rollout { wave }
POST /predict/mitigation/loop/run { modelId }
POST /campaigns/autoalloc/apply { planId }
POST /residency/catalog/{tenantId}/apply { changeId }
GET  /zk/ops/dashboards
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S36)

- Disclosure v2.0: wave‑2/3 partners, marketplace packaging.
- Predictive: loop tuning automation; bias‑aware training hooks.
- Case M18: cross‑campaign optimization.
- Residency: catalog publisher for tenants.
- ZK: long‑term cost optimizations.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S35 sprint plan drafted for planning review.

> Owner: PM — Sprint 35  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

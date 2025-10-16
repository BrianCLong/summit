# IntelGraph — Sprint 38 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-07-13_v1.0`  
**Dates:** Jul 13–Jul 24, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.07.r2` (flags default OFF → progressive cohort enablement)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Grow partner footprint and add controlled autonomy where safe: scale **Disclosure v2.0 marketplace**, pilot **Predictive medium‑risk auto‑apply** with staged approvals, deliver **Case Spaces M20** (portfolio simulations & seasonal planning), stand up **Residency suggestion→draft pipeline**, and run **ZK quarterly review** with cost optimization backlog.

**Definition of Victory (DoV):**

- Marketplace adds **self‑serve preflight** for partners; at least **5 new installs** on stage/prod; rollback drills PASS.
- Predictive medium‑risk auto‑apply (flagged) demonstrates **zero guardrail incidents** on stage with **two‑stage approvals** and cooldowns.
- Case M20 simulator recommends **seasonal plans** that outperform baselines on stage A/B for ≥1 portfolio.
- Residency pipeline turns analytics suggestions into **draft changes** with dry‑run diffs; two drafts approved/applied; revert path validated.
- ZK quarterly review produces **roadmap & cost targets**; two low‑risk optimizations merged without SLO regressions.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Disclosure: marketplace growth features (self‑serve preflight, listing checks, install diagnostics), SLA monitors.
- Predictive: medium‑risk auto‑apply pilot (threshold ranges, routing shifts, conservative weight changes) behind flags, approvals + cooldowns, explainers, rollback.
- Case M20: portfolio simulator (seasonality, constraints, pacing), plan export, approval & apply, attribution guards.
- Residency: suggestion→draft pipeline (forms → draft policy objects), dual approvals, dry‑run diffs, audit bundle.
- ZK: quarterly review (perf/cost), optimization backlog, two changes (e.g., batching window tune, cache policy) with watchdogs & fallback drill.

**Should**

- Cost Model v3.2 (marketplace growth, medium‑risk loop, portfolio sim, pipeline ops, ZK optimizations).
- Publisher UX polish (seasonal calendar, diff viewer, partner self‑serve tooling).

**Won’t (this sprint)**

- High‑risk predictive auto‑apply; marketplace for unvetted third parties; ZK hardware procurement.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Disclosure **Marketplace Growth**

**A1. Self‑Serve Preflight & Listing Checks**

- Validate anchors/signatures/hashes; environment fit; dependency checks. (8 pts)
- _Acceptance:_ Two partner teams pass self‑serve preflight on stage.

**A2. Install Diagnostics & Rollback Macros**

- One‑click diagnostics; guided rollback; comms templates. (5 pts)
- _Acceptance:_ Drill shows ≤5m TTR rollback; diagnostics artifacts archived.

**A3. SLA & Telemetry Enhancements**

- Install/verify latency SLOs; alerts; partner view. (3 pts)
- _Acceptance:_ Week‑long stage soak green.

### Epic B — Predictive **Medium‑Risk Auto‑Apply (Pilot, Flagged)**

**B1. Risk Policy & Eligibility**

- Define medium‑risk envelope (allowed change ranges, blast radius caps). (5 pts)
- _Acceptance:_ Policy file checked into registry; denials include reason.

**B2. Two‑Stage Approvals + Cooldowns**

- Owner + governance approvals; cooldown timers; kill‑switch. (5 pts)
- _Acceptance:_ Two changes applied on stage; cooldown prevents oscillation.

**B3. Explainability & Rollback**

- Rationale attached to scorecards; one‑click revert; audit. (3 pts)
- _Acceptance:_ Revert restores prior metrics on stage.

### Epic C — Case Spaces **M20 (Portfolio Simulations & Seasonal Planning)**

**C1. Simulator Engine**

- Seasonal curves, pacing, blackout windows; constraints. (8 pts)
- _Acceptance:_ Simulator produces plan with expected lift vs baseline.

**C2. Plan Export & Apply**

- Export to calendar; approvals; apply; rollback window. (5 pts)
- _Acceptance:_ One plan applied on stage; rollback window honored.

**C3. Attribution & Safety Rails**

- Ensure redaction/disclosure continuity and link integrity. (3 pts)
- _Acceptance:_ Violations block with actionable reasons.

### Epic D — Residency **Suggestion→Draft Pipeline**

**D1. Forms→Draft Objects** (5 pts) — transform tenant suggestions into draft policy objects with metadata.

**D2. Dry‑Run Diffs & Dual Approvals** (5 pts) — impact report; approvals; export audit bundle.

**D3. Apply & Revert** (3 pts) — timed window; quick revert; dashboard.

### Epic E — ZK **Quarterly Review & Optimizations**

**E1. Review & Targets** (3 pts) — perf/cost review; set Q3 targets.  
**E2. Low‑Risk Optimizations** (5 pts) — tune batching window; cache/key policy; prove watchdogs.  
**E3. Fallback Drill & CI Gate Check** (3 pts) — drills; confirm thresholds; update docs.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Gov/Ops:_ marketplace preflight/diagnostics, residency pipeline approvals
- _Trust Fabric:_ medium‑risk auto‑apply, ZK review + optimizations
- _Graph Core:_ simulator & seasonal planning, attribution guards, plan apply/rollback
- _Copilot/UX:_ partner self‑serve preflight UX, change explainers, seasonal calendar
- _QA/Release:_ drills, preflight QA, rollback tests, pipeline audit QA

**Working Agreements**

- Marketplace installs require **preflight PASS** and a **rollback rehearsal**.
- Medium‑risk auto‑apply remains **flagged**; requires **two‑stage approval** and **cooldowns**.
- Simulator plans cannot publish if **attribution/redaction continuity** fails.
- Residency drafts require **dry‑run diffs** and are **reversible**.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon Jul 13, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed Jul 15 (45m), Fri Jul 17 (30m).
- **Mid‑Sprint Demo & Risk:** Tue Jul 21 (30m).
- **Rollback Drill:** Thu Jul 23 (20m).
- **Review + Demo:** Fri Jul 24 (60m).
- **Retro:** Fri Jul 24 (30m).

---

## 6) Definition of Ready (DoR)

- Stories ≤8 pts; flags named; partner list; risk policy envelope; simulator datasets; pipeline templates; dashboards wired; privacy notes updated.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; self‑serve preflight live; ≥5 installs with SLA green; medium‑risk auto‑apply pilot executed (flagged) with zero incidents; M20 simulator plan applied and measurable lift on stage; residency drafts applied & reversible; ZK review + two optimizations delivered; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Marketplace:** preflight lint; install diagnostics; go‑live + rollback drill.
- **Predictive:** approval workflow; cooldown tests; rollback; denial reasons.
- **Case M20:** simulator backtests; calendar export correctness; attribution guards.
- **Residency:** draft generation; diff accuracy; approvals; revert.
- **ZK:** optimization A/B on stage; watchdog + CI gate checks.

---

## 9) Metrics & Telemetry (Sprint)

- **Disclosure:** installs, verify success/latency, rollback rate.
- **Predictive:** medium‑risk changes proposed/applied, incidents paused, cooldown adherence.
- **Case Ops:** seasonal plan ROI lift, rollback count, guard violations blocked.
- **Residency:** drafts created/applied/reverted, approval SLA.
- **Trust:** verify p95, cost/proof delta, watchdog alerts.
- **Reliability/Cost:** error budget burn, ops cost deltas.

---

## 10) Risks & Mitigations

- **Partner self‑serve errors** → crisp denial messages; diagnostics; staged rollout.
- **Auto‑apply oscillation** → cooldowns; human override; kill‑switch.
- **Seasonal sim mis‑tuning** → confidence bands; small‑step apply; revert window.
- **Draft pipeline cascades** → impact report; dual approvals; revert.
- **Optimization regressions** → watchdogs; CI perf gates; fallback.

---

## 11) Deliverables (Artifacts)

- `docs/` → Marketplace preflight & diagnostics, Medium‑risk auto‑apply SOP, M20 simulator spec, Residency draft pipeline SOP, ZK Q‑review + optimizations.
- Dashboards: Disclosure (marketplace/SLA), Predictive (auto‑apply), Case Ops (sim/plans), Residency (drafts), Trust (ZK), Reliability/Cost.
- Runbooks: “Marketplace Preflight & Rollback”, “Medium‑Risk Apply & Cooldowns”, “Seasonal Plan Apply/Revert”, “Residency Draft→Apply”, “ZK Optimization Ops”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-DISCLOSURE-MARKETPLACE-GROWTH`, `EPIC-PRED-AUTOAPPLY-MED`, `EPIC-CASE-M20`, `EPIC-RESIDENCY-DRAFT-PIPELINE`, `EPIC-ZK-QREVIEW-OPT`  
**Labels:** `marketplace-growth`, `auto-apply-medium`, `seasonal-planning`, `residency-draft`, `zk-optimization`  
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
POST /marketplace/disclosure/preflight { listingId }
POST /predict/autoapply/medium { modelId, change }
POST /portfolio/simulate { campaigns[], constraints, season }
POST /residency/draft/create { tenantId, suggestionId }
POST /zk/opt/apply { changeId }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S39)

- Disclosure: partner scorecards & ratings; auto‑preflight on submission.
- Predictive: med‑risk → selected low‑impact auto‑apply in prod cohorts.
- Case M21: seasonal plan → annual roadmap helper.
- Residency: draft pipeline → scheduled publish windows.
- ZK: adopt best optimization learnings into defaults.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S38 sprint plan drafted for planning review.

> Owner: PM — Sprint 38  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

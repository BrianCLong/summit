# IntelGraph — Sprint 36 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-06-15_v1.0`  
**Dates:** Jun 15–Jun 26, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.06.r2` (flags default OFF → progressive cohort enablement)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Scale what we shipped and reduce operational drag: expand **Disclosure v2.0 GA** to new partners and ready **marketplace packaging**, automate **Predictive mitigation loops** (tuning + fairness‑aware training hooks), deliver **Case Spaces M18** (cross‑campaign optimization & pacing), stand up **Residency Catalog Publisher** (tenant self‑serve with approvals), and lock **ZK steady‑state cost plans** (or proof‑streaming POC behind flags).

**Definition of Victory (DoV):**
- Disclosure v2.0 wave‑2/3 partners live; **marketplace package** draft approved; migration coverage ≥99% sustained.
- Predictive continuous mitigation runs on a schedule with **auto‑proposed tuning** and **training‑hook outputs** logged; scorecards auto‑publish weekly.
- Case M18 optimizer improves **campaign ROI** on stage with pacing/fatigue controls and safe‑apply gates.
- Residency Catalog Publisher enables **tenant policy updates** via curated forms with **dual approvals** and **dry‑run diffs**; audit bundles produced.
- ZK ops either: **steady‑state cost plan approved** with budgets/alerts OR **proof‑streaming POC** demonstrates ≥10% verify latency reduction in stage without SLO regressions.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- Disclosure: partner wave‑2/3 rollout + marketplace package (draft schema, listing metadata, verify preflight).
- Predictive: loop automation (scheduler, cooldowns), fairness‑aware training hooks (safe features), weekly auto‑scorecards.
- Case M18: cross‑campaign optimizer (budget/time), pacing/fatigue controls, approval + rollback.
- Residency: Catalog Publisher (tenant forms → policy objects), dual approvals, dry‑run diffs, SLA dashboard.
- ZK: steady‑state cost plan (budgets, capacity) **or** proof‑streaming POC (flagged) with watchdogs + CPU fallback.

**Should**
- Cost Model v3.0 (disclosure marketplace + loop automation + optimizer + catalog ops + ZK plan/streaming).  
- Publisher UX polish (campaign compare view, tenant policy previews).

**Won’t (this sprint)**
- Disclosure marketplace go‑live; predictive model feature expansion; ZK bespoke hardware.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Disclosure **v2.0 GA Expansion + Marketplace Prep**
**A1. Partner Wave‑2/3 Rollout**  
- Trust store updates, comms, rollback drills, SLA probes. (8 pts)  
- *Acceptance:* Wave‑2/3 green; drill PASS; SLA dashboard green.

**A2. Marketplace Package Draft**  
- Listing metadata, signing profile, verify preflight, deprecation notes. (5 pts)  
- *Acceptance:* Package validated in staging catalog; review sign‑off.

**A3. Migration Coverage Guard**  
- Long‑tail converters; coverage report ≥99%. (3 pts)  
- *Acceptance:* Report attached to release; exceptions logged.

### Epic B — Predictive **Loop Automation + Fairness Training Hooks**
**B1. Loop Scheduler & Cooldowns**  
- Automate detect→recommend→what‑if→approve→apply→verify; cooldowns to avoid oscillation. (8 pts)  
- *Acceptance:* Two scheduled loops complete; no guardrail incidents.

**B2. Training Hooks (Fairness‑Aware)**  
- Emit policy‑safe features/weights deltas; gated export; lineage to registry. (5 pts)  
- *Acceptance:* Hooks captured for two models; diffs visible in registry.

**B3. Weekly Auto‑Scorecards v2**  
- Publish weekly scorecards; add parity trends + drift notes. (3 pts)  
- *Acceptance:* Two scorecards auto‑published; links in release notes.

### Epic C — Case Spaces **M18 (Cross‑Campaign Optimizer & Pacing)**
**C1. Optimizer Engine**  
- Allocate spend/time across campaigns; constraints; confidence bands. (8 pts)  
- *Acceptance:* Stage A/B shows ROI lift on at least one portfolio.

**C2. Pacing & Fatigue Controls**  
- Throttle frequency per audience; blackout windows; safety rails. (5 pts)  
- *Acceptance:* Controls enforced; no SLA regressions on stage.

**C3. Apply/Approve/Rollback**  
- Preview diffs; approvals; one‑click revert. (3 pts)  
- *Acceptance:* Change applies + reverts cleanly; audit trail.

### Epic D — Residency **Catalog Publisher (Tenant Self‑Serve)**
**D1. Policy Forms → Objects** (5 pts) — curated forms map to policies (retention/routing/flags).

**D2. Dual Approvals + Dry‑Run Diffs** (5 pts) — owner + compliance; diffs & impact; export audit.

**D3. SLA & Delivery Dashboard** (3 pts) — track requests, approvals, publish times, rollback rate.

### Epic E — ZK **Ops Plan (or Proof‑Streaming POC)**
**E1. Steady‑State Cost Plan** (5 pts) — budgets, capacity, watchdog cadences, playbooks.  
**E2. Proof‑Streaming POC (Flagged)** (5 pts) — stream verification chunks; watchdogs; CPU fallback.  
**E3. Decision Memo** (2 pts) — adopt streaming or stay steady‑state; update CI gates.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Gov/Ops:* partner waves, marketplace package, catalog publisher, SLA dashboards
- *Trust Fabric:* loop scheduler, training hooks, ZK ops/POC
- *Graph Core:* optimizer engine, pacing controls, approvals/rollback
- *Copilot/UX:* scorecard v2, tenant policy forms, optimizer previews
- *QA/Release:* drills (rollback/streaming fallback), migration guards, catalog QA

**Working Agreements**
- No partner wave without **rollback drill PASS** and SLA probes green.  
- Loop automation runs with **cooldowns** and **manual approval** preserved for medium/high‑impact changes.  
- Optimizer changes must pass **dependency checks** (disclosure/redaction continuity) and be **reversible**.  
- Catalog Publisher enforces **dual approvals** + **dry‑run diffs** before publish.

---

## 5) Ceremonies & Calendar
- **Planning:** Mon Jun 15, 90m.  
- **Stand‑ups:** 9:30–9:40 MT daily.  
- **Grooming:** Wed Jun 17 (45m), Fri Jun 19 (30m).  
- **Mid‑Sprint Demo & Risk:** Tue Jun 23 (30m).  
- **Rollback/Streaming Drill:** Thu Jun 25 (20m).  
- **Review + Demo:** Fri Jun 26 (60m).  
- **Retro:** Fri Jun 26 (30m).

---

## 6) Definition of Ready (DoR)
- Stories ≤8 pts; flags; partner lists; datasets/cohorts; tenant policy templates; dashboards wired; privacy notes updated.

## 7) Definition of Done (DoD)
- Tests ≥ 90%; partner waves launched; marketplace package drafted; mitigation loops scheduled + hooks emitting; M18 optimizer shipped (flagged) with A/B lift; catalog publisher live with dual approvals & diffs; ZK steady‑plan or streaming POC decision executed; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Disclosure:** wave drill; marketplace package lint; migration coverage.  
- **Predictive:** loop schedule dry‑runs; cooldown oscillation tests; hook lineage.  
- **Case M18:** optimizer backtests; pacing guard; apply/revert.  
- **Residency:** form→policy mapping; dual approval flow; dry‑run diffs.  
- **ZK:** budgets & watchdogs; streaming fallback drill; CI gate updates.

---

## 9) Metrics & Telemetry (Sprint)
- **Disclosure:** partners live, verify success/latency, migration coverage.  
- **Predictive:** loops executed, scorecards published, approval vs auto‑apply ratios.  
- **Case Ops:** portfolio ROI lift, pacing violations blocked, rollback rate.  
- **Residency:** requests submitted/approved/published, time‑to‑publish, rollback.  
- **Trust:** verify p95, streaming impact, cost/proof.  
- **Reliability/Cost:** error budget burn, ops cost deltas.

---

## 10) Risks & Mitigations
- **Marketplace scope creep** → draft now; defer go‑live to separate track.  
- **Loop oscillations** → cooldowns; human approval; revert.  
- **Optimizer overfits** → confidence bands + backtests; staged rollout.  
- **Tenant policy misuse** → curated forms; approvals; diff/audit.  
- **Streaming instability** → strict flags; watchdogs; CPU fallback.

---

## 11) Deliverables (Artifacts)
- `docs/` → Disclosure partner wave+package notes; Loop Automation & Hooks guide; M18 Optimizer spec; Catalog Publisher SOP; ZK Ops/Streaming memo.  
- Dashboards: Disclosure (partners/SLA), Predictive (loops/scorecards), Case Ops (optimizer/pacing), Residency (publisher), Trust (ZK), Reliability/Cost.  
- Runbooks: “Partner Wave & Rollback”, “Loop Cadence & Cooldowns”, “Optimizer Apply/Rollback”, “Catalog Publish & Revert”, “Streaming Fallback”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-DISCLOSURE-GA-EXPANSION`, `EPIC-PRED-LOOP-AUTOMATION`, `EPIC-CASE-M18`, `EPIC-RESIDENCY-CATALOG-PUBLISHER`, `EPIC-ZK-OPS-PLAN`  
**Labels:** `disclosure-partners`, `loop-automation`, `optimizer`, `catalog-publisher`, `zk-ops`  
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
POST /disclosure/partners/enable { wave }
POST /predict/loops/schedule { modelId, policy }
POST /campaigns/portfolio/optimize { campaigns[], constraints }
POST /residency/catalog/publish { tenantId, changes[] }
POST /zk/streaming/enable { region, cohort }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S37)
- Disclosure: marketplace go‑live & listing QA.  
- Predictive: auto‑apply for low‑risk loop changes (flagged).  
- Case M19: optimizer → goal‑seeking with budget guard.  
- Residency: tenant catalog analytics & suggestions.  
- ZK: adopt/decline streaming; long‑term cost program.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial S36 sprint plan drafted for planning review.

> Owner: PM — Sprint 36  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead


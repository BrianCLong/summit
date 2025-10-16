# IntelGraph — Sprint 37 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-06-29_v1.0`  
**Dates:** Jun 29–Jul 10, 2026 (10 working days; **US holiday Jul 4 (observed Jul 3)**)  
**Cadence:** 2 weeks (holiday‑impacted)  
**Release Train:** `2026.07.r1` (flags default OFF → progressive cohort enablement)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Convert spring pilots into durable, partner‑scale capabilities: launch **Disclosure v2.0 marketplace** (go‑live), enable **Predictive low‑risk auto‑apply** within mitigation loops (flagged), deliver **Case Spaces M19** (goal‑seeking optimizer with budget guard), add **Residency tenant catalog analytics & suggestions**, and finalize **ZK long‑term cost program** (adopt streaming or optimize steady‑state).

**Definition of Victory (DoV):**

- Disclosure marketplace listing(s) are **live** with preflight verification and rollback path; partner installs complete with SLA probes green.
- Predictive mitigation loops can **auto‑apply low‑risk changes** behind flags with human override, and demonstrate no guardrail incidents on stage.
- Case M19 optimizer reaches **target ROI or cost constraints** on stage for ≥1 portfolio with audit and rollback.
- Residency catalog analytics produce **top suggestions** per tenant; at least two suggestions approved/applied; no cascade incidents.
- ZK ops: **decision recorded** (streaming adopted vs steady‑state), CI gates updated, cost/SLO dashboards green.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Disclosure: marketplace go‑live (listing QA, signing profile, verify preflight, comms, rollback), telemetry & SLAs.
- Predictive: low‑risk auto‑apply (policy‑safe classes), approvals & cooldowns, audit trail, flag controls.
- Case M19: goal‑seeking optimizer (maximize ROI or minimize cost under constraints), approval & apply path, attribution guardrails.
- Residency: tenant catalog analytics (usage, violations, drift), suggestion engine, approval/apply, revert.
- ZK: long‑term cost plan (budgets, cadence) **or** streaming adoption (rollout plan, watchdogs, CPU fallback) with updated CI thresholds.

**Should**

- Cost Model v3.1 (marketplace ops + auto‑apply loops + goal‑seek + catalog suggestions + ZK plan/streaming).
- Publisher UX polish (goal slider, suggestion compare, install diagnostics for marketplace).

**Won’t (this sprint)**

- Predictive medium/high‑risk auto‑apply; disclosure marketplace for unvetted third parties; ZK bespoke hardware.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Disclosure **Marketplace Go‑Live**

**A1. Listing QA & Preflight Verify**

- Validate metadata, signatures, hashes, anchors; preflight verify checks. (8 pts)
- _Acceptance:_ Staging catalog PASS; production listing approved.

**A2. Go‑Live Runbook & Rollback**

- Launch windows, health checks, rollback macro, comms. (5 pts)
- _Acceptance:_ Dry‑run PASS; rollback drill ≤5m TTR.

**A3. Telemetry & SLAs**

- Install/verify success, latency, error budgets; pager rota. (3 pts)
- _Acceptance:_ Dashboard green for 1 week on stage.

### Epic B — Predictive **Low‑Risk Auto‑Apply (Flagged)**

**B1. Low‑Risk Classifier & Policy**

- Define eligible changes (threshold nudge, ranker weight cap, routing percentage) and classifier. (8 pts)
- _Acceptance:_ Precision ≥0.9 on fixtures; violations blocked.

**B2. Auto‑Apply Engine & Cooldowns**

- Auto‑apply with cooldowns + human override; audit events; flags. (5 pts)
- _Acceptance:_ Two auto‑applies on stage; no guardrail incidents.

**B3. Rollback & Explainability**

- One‑click revert; change rationale in scorecards/release notes. (3 pts)
- _Acceptance:_ Revert restores prior behavior; rationale clear.

### Epic C — Case Spaces **M19 (Goal‑Seeking Optimizer + Guard)**

**C1. Objective & Constraints**

- Objective functions (ROI↑, cost↓, verify rate↑); constraints (budget, pacing, compliance). (8 pts)
- _Acceptance:_ Optimizer achieves target on stage; constraint logs attached.

**C2. Approval/Apply/Rollback**

- Preview diffs; approvals; apply; quick revert. (3 pts)
- _Acceptance:_ Two applied changes; one reverted; audit trail intact.

**C3. Attribution & Safety Rails**

- Prevent redaction/disclosure breaks; validate link integrity. (3 pts)
- _Acceptance:_ Violations block with reasons.

### Epic D — Residency **Tenant Catalog Analytics & Suggestions**

**D1. Analytics Engine** (5 pts) — usage/violations/drift trends per tenant; risk scores.  
**D2. Suggestion Generator** (5 pts) — propose catalog updates; confidence bands; human approval.  
**D3. Apply & Revert** (3 pts) — publish change; revert path; audit bundle.

### Epic E — ZK **Long‑Term Cost Program (or Streaming Adoption)**

**E1. Program Plan** (5 pts) — budgets, cadence, KPIs, on‑call gates.  
**E2. Streaming Rollout (if adopt)** (5 pts) — flags, watchdogs, CPU fallback, CI thresholds.  
**E3. Decision Record** (2 pts) — adopt vs steady‑state; runbooks updated.

> **Sprint Point Budget:** **72 pts** (holiday‑adjusted: Graph Core 22, Trust Fabric 24, Copilot/UX 9, Gov/Ops 12, QA/Release 5).  
> **Capacity Check:** Adjusted for Jul 3 observed holiday; amber‑green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Gov/Ops:_ marketplace go‑live, rollback drills, tenant catalog analytics
- _Trust Fabric:_ low‑risk auto‑apply engine, ZK program/streaming
- _Graph Core:_ goal‑seeking optimizer, attribution guards, approvals/rollback
- _Copilot/UX:_ install diagnostics, auto‑apply explanations, optimizer previews
- _QA/Release:_ listing QA, guardrail drills, rollback tests

**Working Agreements**

- Marketplace launch requires **preflight verify PASS** and **rollback rehearsal**.
- Auto‑apply runs behind **flags**, restricted to **low‑risk** class, with **one‑click revert**.
- Optimizer changes must satisfy **constraints** and keep **attribution integrity**.
- Catalog suggestions require **human approval** and **revert path**.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon Jun 29, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed Jul 1 (45m), Tue Jul 7 (30m).
- **Holiday:** Fri Jul 3 (US, observed).
- **Mid‑Sprint Demo & Risk:** Wed Jul 8 (30m).
- **Rollback Drill:** Thu Jul 9 (20m).
- **Review + Demo:** Fri Jul 10 (60m).
- **Retro:** Fri Jul 10 (30m).

---

## 6) Definition of Ready (DoR)

- Stories ≤8 pts; flags named; partner listing ready; low‑risk policy defined; objectives/constraints specified; dashboards wired; privacy notes updated.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; marketplace live with rollback/SLA green; low‑risk auto‑apply shipped (flagged) with zero guardrail incidents; M19 optimizer met target on stage; catalog analytics + suggestions applied safely; ZK program decision recorded & CI updated; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Marketplace:** listing lint; preflight verify; go‑live + rollback drill.
- **Predictive:** classifier precision; auto‑apply cooldowns; guardrail negative tests.
- **Case M19:** objective attainment; constraint violations; apply/revert.
- **Residency:** analytics integrity; suggestion accuracy; revert.
- **ZK:** program KPIs; streaming fallback drill; CI thresholds.

---

## 9) Metrics & Telemetry (Sprint)

- **Disclosure:** installs, verify success/latency, rollback rate.
- **Predictive:** auto‑applies vs approvals, incidents paused, scorecard links.
- **Case Ops:** objective met %, ROI lift, rollback rate.
- **Residency:** suggestions proposed/applied/reverted, time‑to‑apply, violations trend.
- **Trust:** verify p95, streaming impact (if enabled), cost/proof.
- **Reliability/Cost:** error budget burn, ops cost deltas.

---

## 10) Risks & Mitigations

- **Marketplace launch regressions** → staged rollout + rollback macro; install diagnostics.
- **Auto‑apply misclassification** → conservative low‑risk class; human override; cooldowns.
- **Goal‑seek overshoot** → strict constraints; small steps; revert on breach.
- **Catalog suggestion drift** → confidence bands; dual approvals; revert.
- **Streaming instability** → guard behind flags; watchdogs; CPU fallback.

---

## 11) Deliverables (Artifacts)

- `docs/` → Marketplace Go‑Live guide; Low‑Risk Auto‑Apply SOP; M19 Goal‑Seeking spec; Catalog Analytics & Suggestions SOP; ZK Long‑Term Cost/Streaming memo.
- Dashboards: Disclosure (marketplace/SLA), Predictive (auto‑apply/incidents), Case Ops (goal‑seek/ROI), Residency (catalogs/suggestions), Trust (ZK), Reliability/Cost.
- Runbooks: “Marketplace Rollout & Rollback”, “Auto‑Apply & Cooldowns”, “Goal‑Seek Approve/Revert”, “Catalog Suggest/Apply/Revert”, “Streaming Fallback”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-DISCLOSURE-MARKETPLACE`, `EPIC-PRED-AUTOAPPLY-LR`, `EPIC-CASE-M19`, `EPIC-RESIDENCY-CATALOG-ANALYTICS`, `EPIC-ZK-LONGTERM-COST`  
**Labels:** `disclosure-marketplace`, `auto-apply-lowrisk`, `goal-seek`, `catalog-analytics`, `zk-cost`  
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
POST /marketplace/disclosure/publish { listingId }
POST /predict/autoapply/lowrisk { modelId, plan }
POST /campaigns/goalseek/apply { objective, constraints }
GET  /residency/catalog/analytics?tenantId=...
POST /zk/cost/program/commit { mode: "steady"|"streaming" }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S38)

- Disclosure: marketplace growth & ratings; partner self‑serve listing checks.
- Predictive: medium‑risk auto‑apply (with staged approvals).
- Case M20: portfolio‑level simulations & seasonal planning.
- Residency: automated suggestion → draft change pipeline.
- ZK: program quarterly review & cost optimizations.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S37 sprint plan drafted for planning review.

> Owner: PM — Sprint 37  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

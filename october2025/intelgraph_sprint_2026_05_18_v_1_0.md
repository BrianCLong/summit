# IntelGraph — Sprint 34 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-05-18_v1.0`  
**Dates:** May 18–May 29, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.05.r3` (flags default OFF → progressive enablement by cohort)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Automate governance‑safe improvements while locking in partner‑ready packaging: deliver **Predictive automated bias mitigation (HITL)**, optimize **ZK Acceleration steady‑state cost** (or complete final exit), ship **Case Spaces M16** (campaign budget planner), pilot **Residency high‑risk remediations** with tight gates, and drive **Disclosure v2.0 GA Readiness** (RC → GA checklist + partner SLAs).

**Definition of Victory (DoV):**

- Predictive generates **remediation recommendations** automatically; humans approve/apply with **what‑if previews**; releases blocked unless plan exists when thresholds are breached.
- ZK Accel holds **p95 verify ≤ 320ms** with **cost/proof ↓ ≥15%** vs prior sprint **or** exit completed and CI gates restored.
- Case M16 proposes **budget allocations** (per audience/channel/timezone) with expected ROI and risk; two changes applied with positive A/B lift.
- Residency **high‑risk** remediations (schema change/data movement) run under **multi‑stage approvals** and dry‑run diffs; zero cascade incidents on stage.
- Disclosure v2.0 has **GA readiness pack** (perf, migration ≥98%, anchors/attestations) and **partner support SLAs** defined.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Predictive: automated bias remediation recommender (policy‑safe), what‑if preview, registry gate requiring a plan.
- ZK Accel: steady‑state cost optimization (batching/params/scheduling) **or** final decommission.
- Case M16: campaign budget planner (cost curves, reach/verify forecasts), approval + schedule apply.
- Residency: high‑risk remediation pilot (schema/retention/migration) with dry‑run, staged cutover, rollback.
- Disclosure v2.0: GA readiness checklist, partner SLA book, RC → GA delta fixes.

**Should**

- Cost Model v2.8 (remediation cost + accel tuning + campaign budgets + v2 GA ops).
- Publisher UX polish for budget sliders and risk badges.

**Won’t (this sprint)**

- New predictive features; ZK bespoke hardware procurement; residency auto‑apply for high‑risk in prod; Disclosure v2 marketplace features.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Predictive **Automated Bias Mitigation (HITL)**

**A1. Recommender Engine**

- Generate remediation options (feature prune, threshold adjust, cohort routing) per violated slice. (8 pts)
- _Acceptance:_ Top 3 recommendations per violation; attached to scorecard.

**A2. What‑If Preview & Trade‑offs**

- Simulate impact on held‑out data; show precision/recall/fairness deltas. (5 pts)
- _Acceptance:_ Preview attached to two approvals; human sign‑off required.

**A3. Registry Gate: Plan Required**

- Block release if thresholds breached without accepted plan; CI API. (3 pts)
- _Acceptance:_ Gate denies contrived breach; reason lists missing plan.

### Epic B — ZK **Acceleration Cost Optimizations (or Exit)**

**B1. Prover Scheduling + Batching**

- Batch window tuning; queue shaping; energy‑aware scheduling. (5 pts)
- _Acceptance:_ Cost/proof ↓ ≥10% with p95 verify unchanged.

**B2. Parameter Tuning & Caches**

- CRS/proving key cache strategies; warm paths; micro‑bench. (5 pts)
- _Acceptance:_ Cost/proof ↓ additional ≥5%; no regressions.

**B3. Exit Close‑out (if sunset)**

- Remove flags; decommission; CI gates restored; TCO report. (3 pts)

### Epic C — Case Spaces **M16 (Campaign Budget Planner)**

**C1. Cost Curves & Forecasts**

- Model cost vs reach/verify per audience/timezone; sensitivity bands. (5 pts)
- _Acceptance:_ Planner shows ROI bands; backtests pass on stage.

**C2. Allocation Suggestions & Apply**

- Suggest budget/time reallocations; approval gate; schedule update. (5 pts)
- _Acceptance:_ Two approved reallocations applied; positive A/B lift.

**C3. Risk & Dependency Checks**

- Redaction/disclosure continuity + link integrity; block risky plans. (3 pts)
- _Acceptance:_ Violations block with reasons; audit recorded.

### Epic D — Residency **High‑Risk Remediations (Pilot)**

**D1. Dry‑Run Diff & Impact Report** (5 pts) — simulate change (schema/retention/migration), produce diffs + impact.

**D2. Multi‑Stage Approvals** (3 pts) — owner + compliance + SRE; timed rollback window.

**D3. Staged Cutover + Rollback** (2 pts) — cutover plan; safe revert; audit.

### Epic E — Disclosure **v2.0 GA Readiness**

**E1. GA Checklist & Delta Fixes** (5 pts) — perf, offline, anchors, migration parity; fix RC gaps.

**E2. Partner Support SLAs** (3 pts) — response/rotation windows, tooling, contacts.

**E3. Migration Coverage ≥98%** (2 pts) — extend converter; gap log + mitigations.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Gov/Ops:_ registry gate, residency remediation pilot, GA checklist/SLA
- _Trust Fabric:_ ZK cost tuning/exit, caches, CI gates
- _Graph Core:_ budget planner, allocation apply, risk checks
- _Copilot/UX:_ what‑if previews, budget sliders, risk badges
- _QA/Release:_ drills (rollback, exit), migration coverage QA, planner validation

**Working Agreements**

- No predictive release with breached thresholds **without approved plan**.
- Any high‑risk remediation requires **dry‑run diff, multi‑stage approvals, rollback plan**.
- Budget planner changes must pass **dependency checks** and be **reversible**.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon May 18, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed May 20 (45m), Fri May 22 (30m).
- **Mid‑Sprint Demo & Risk:** Tue May 26 (30m).
- **Rollback/Exit Drill:** Thu May 28 (20m).
- **Review + Demo:** Fri May 29 (60m).
- **Retro:** Fri May 29 (30m).

---

## 6) Definition of Ready (DoR)

- Stories ≤8 pts; flags named; thresholds/datasets defined; partner list; dashboards wired; privacy notes updated.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; recommender + what‑if previews live; registry plan gate enforced; ZK cost optimized (or exit complete); M16 budget planner shipped with applied wins; high‑risk residency pilot executed safely; v2 GA readiness + SLAs done; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Predictive:** recommendation quality spot‑checks; plan gate negative; what‑if reproducibility.
- **ZK:** cost/perf before/after; cache warm tests; exit CI gates.
- **Case M16:** ROI backtests; A/B power calc; dependency violations.
- **Residency:** dry‑run diffs; staged cutover; rollback drill.
- **Disclosure:** GA checklist run; migration 98%; SLA paging tests.

---

## 9) Metrics & Telemetry (Sprint)

- **Predictive:** violations with plans, simulator usage, gate failures.
- **Trust:** verify p95, cost/proof delta, fallback/exit events.
- **Case Ops:** budget moves applied, ROI lift, dependency blocks.
- **Residency:** high‑risk pilots executed, approval SLA, rollback success.
- **Disclosure:** migration coverage, SLA response times, GA checklist status.
- **Reliability/Cost:** error budget burn, ops cost delta.

---

## 10) Risks & Mitigations

- **Remediation over‑fitting** → hold‑out eval; human sign‑off; rollback.
- **Cost optimizations regress perf** → guard p95 gate; rollback to prior params.
- **Budget planner misallocates** → confidence bands; staged rollouts; revert.
- **High‑risk remediation cascade** → dry‑run + approvals + canary; backout.
- **GA checklist slippage** → daily burn‑down; owner per item.

---

## 11) Deliverables (Artifacts)

- `docs/` → Bias Auto‑Remediation spec, ZK Cost Tuning or Exit memo, M16 Budget Planner spec, Residency High‑Risk Pilot SOP, Disclosure v2 GA Readiness & SLAs.
- Dashboards: Predictive (remediation), Trust (cost/perf), Case Ops (budget/ROI), Residency (pilot), Disclosure (GA).
- Runbooks: “Remediation Approval”, “ZK Cost Tuning/Exit”, “Budget Apply/Rollback”, “High‑Risk Cutover”, “v2 GA Support”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-PRED-AUTO-REMEDIATION`, `EPIC-ZK-COST-OPT`, `EPIC-CASE-M16`, `EPIC-RESIDENCY-HIGH-RISK`, `EPIC-DISCLOSURE-2.0-GA`  
**Labels:** `bias-auto`, `zk-cost`, `budget-planner`, `residency-highrisk`, `disclosure-v2-ga`  
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
POST /predict/remediation/recommend { modelId }
POST /predict/remediation/preview { modelId, changes }
POST /zk/cost/tune { params }
POST /campaigns/budget/allocate { plan }
POST /residency/remediation/highrisk/dryrun { change }
GET  /disclosure/v2/ga/checklist
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S35)

- Predictive: continuous bias mitigation loops; fairness‑aware training hooks.
- ZK: finalize steady‑state ops dashboards or post‑mortem wrap‑up.
- Case M17: budget planner → predictive auto‑allocation (flagged).
- Residency: productionize high‑risk flows with per‑tenant catalogs.
- Disclosure v2: GA launch and partner expansion.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S34 sprint plan drafted for planning review.

> Owner: PM — Sprint 34  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

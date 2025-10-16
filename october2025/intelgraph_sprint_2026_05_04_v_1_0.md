# IntelGraph — Sprint 33 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-05-04_v1.0`  
**Dates:** May 4–May 15, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.05.r2` (flags default OFF → progressive enablement by cohort)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Close the loop on governance‑at‑scale and push partners toward production: enable **Bias Remediation flows** in Predictive (registry‑driven), execute **ZK Acceleration Phase‑5** to reach steady‑state ops (or exit completely), ship **Case Spaces M15** (campaign analytics + ROI insights), expand **Residency Auto‑Apply** to **medium‑risk** fixes with staged approvals, and advance **Disclosure v2.0 → RC** with partner pilot expansion.

**Definition of Victory (DoV):**

- Predictive models ship with **bias remediation suggestions** (policy‑safe) and **what‑if simulator**; releases blocked unless remediation plan attached when thresholds are exceeded.
- ZK Accel Phase‑5 running in **steady‑state** across primary regions with watchdogs and cost budgets **green for 7 days** (or clean sunset complete).
- Case M15 surfaces **campaign ROI & reach** with attribution and **A/B readouts**; top 3 optimization suggestions drive measurable stage lift.
- Residency auto‑apply supports **medium‑risk** fixes (e.g., retention window tightening) with **two‑stage approvals** and revert.
- Disclosure v2.0 **RC** (viewer/signer): partner pilot expanded to **5+ partners**, migration success ≥95% of v1 bundles.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Predictive: Bias remediation flows (suggestions, playbooks), **what‑if simulator**, registry gates for remediation plan.
- ZK Accel: Phase‑5 steady‑state (or final sunset), watchdogs + CPU fallback drills, budget alarms, CI perf gates.
- Case M15: campaign analytics (reach/verify/funnel), ROI estimates, suggestion readouts.
- Residency: medium‑risk auto‑apply (opt‑in) with staged approvals (2‑step), cascades guard, full audit.
- Disclosure v2.0: RC hardening, partner expansion, migration coverage, performance budgets.

**Should**

- Cost Model v2.7 (steady‑state accel + medium‑risk remediations + v2 RC), Registry “what‑if” audit export.

**Won’t (this sprint)**

- Predictive new features; bespoke ZK hardware; Disclosure v2.0 GA.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Predictive **Bias Remediation + What‑If Simulator**

**A1. Remediation Suggestions & Playbooks**

- Generate per‑slice remediation options (feature pruning, threshold adjust, cohort routing). (8 pts)
- _Acceptance:_ Suggestions attach to scorecards; at least one mitigation path per violated slice.

**A2. What‑If Simulator**

- Simulate policy‑safe tweaks on held‑out data; show trade‑offs. (5 pts)
- _Acceptance:_ Simulator report export (PDF/JSON) attached to two releases.

**A3. Registry Gate: Remediation Plan**

- Block release if bias thresholds breached without plan; CI API. (3 pts)
- _Acceptance:_ Gate denies a contrived violation; denial reason clear.

### Epic B — ZK **Acceleration Phase‑5 (Steady‑State or Exit)**

**B1. Steady‑State Ops Enablement**

- Enable across primary regions; SLOs; saturation alarms. (8 pts)
- _Acceptance:_ p95 verify ≤ 320ms 7‑day median; watchdog drills PASS.

**B2. Exit Finalization (if NO‑GO)**

- Remove flags; decommission infra; CI revert; TCO close‑out. (5 pts)
- _Acceptance:_ All flags OFF; CI/alerts green; memo archived.

**B3. On‑Call & Runbooks**

- Update on‑call SOP; cost guardrails; fallback playbooks. (3 pts)

### Epic C — Case Spaces **M15 (Campaign Analytics + ROI)**

**C1. Analytics & Attribution**

- Reach/open/verify, revocation, time‑to‑verify; attribution model. (5 pts)
- _Acceptance:_ Dashboard live; attribution passes backtest.

**C2. A/B Readouts**

- Lift metrics for timing/layout/redaction clarity; confidence intervals. (5 pts)
- _Acceptance:_ Two experiments with statistically significant readouts.

**C3. Optimization Suggestions**

- Present top 3 suggestions per campaign; approval + apply path. (3 pts)
- _Acceptance:_ Approved suggestion updates future schedule.

### Epic D — Residency **Auto‑Apply (Medium‑Risk, Staged Approvals)**

**D1. Fix Types & Policies** (5 pts) — retention tighten, data routing shifts, policy flag changes.

**D2. Two‑Stage Approvals** (3 pts) — owner + compliance sign‑off; timed rollback window.

**D3. Cascade Guard & Revert** (2 pts) — detect cross‑tenant impacts; one‑click revert.

### Epic E — Disclosure **v2.0 RC (Partner Expansion)**

**E1. RC Hardening** (5 pts) — performance budgets, offline verify edge cases, anchor rotations.

**E2. Partner Expansion** (3 pts) — onboard 3 additional partners; trust store updates.

**E3. Migration Coverage** (2 pts) — cover ≥95% v1 variants; gap report with mitigation.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Gov/Ops:_ remediation gates, residency auto‑apply approvals, partner onboarding
- _Trust Fabric:_ ZK steady‑state or exit, RC hardening, CI gates, cost guardrails
- _Graph Core:_ campaign analytics & suggestions, A/B readouts
- _Copilot/UX:_ remediation simulator UX, suggestion previews, RC viewer UX
- _QA/Release:_ drills (pause/rollback/fallback), migration coverage QA

**Working Agreements**

- **No predictive release** with breached bias thresholds unless a remediation plan is attached and approved.
- ZK accel remains behind monitors; **CPU fallback** proven weekly while enabled.
- Medium‑risk residency fixes require **two‑stage approvals** and **revert** path validated.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon May 4, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed May 6 (45m), Fri May 8 (30m).
- **Mid‑Sprint Demo & Risk:** Tue May 12 (30m).
- **Fallback Drill (if accel ON):** Thu May 14 (20m).
- **Review + Demo:** Fri May 15 (60m).
- **Retro:** Fri May 15 (30m).

---

## 6) Definition of Ready (DoR)

- Stories ≤8 pts; flags named; cohorts/regions enumerated; bias thresholds & datasets defined; partner list updated; dashboards wired; privacy notes updated.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; remediation gate enforced; what‑if simulator outputs attached; ZK Phase‑5 steady‑state (or exit) executed; M15 analytics & suggestions shipped; medium‑risk auto‑apply live with approvals; v2 RC partner expansion live; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Predictive:** remediation gate negative test; simulator report diffs; bias threshold breach scenario.
- **ZK:** 7‑day p95 watch; fallback drill; CI thresholds.
- **Case M15:** attribution backtest; A/B sample size; suggestion approval → schedule update.
- **Residency:** staged approvals; cascade guard; revert.
- **Disclosure:** RC perf tests; offline edge cases; migration coverage harness.

---

## 9) Metrics & Telemetry (Sprint)

- **Predictive:** bias breaches with plans, simulator usage, release gate failures.
- **Trust:** verify p95, fallback events, accel cost/proof.
- **Case Ops:** campaign reach/verify, lift metrics, suggestion adoption.
- **Residency:** medium‑risk fixes applied/reverted, approval SLA, cascade blocks.
- **Disclosure:** v2 verify success, partner pilot health, migration coverage.
- **Reliability/Cost:** error budget burn, cost deltas.

---

## 10) Risks & Mitigations

- **Remediation over‑tightening** → simulator preview + human approval; rollback.
- **Accel cost drift** → strict budgets; saturation alarms; fallback.
- **Attribution bias** → backtests; sensitivity analysis.
- **Medium‑risk cascades** → guardrails + staged approvals; revert.

---

## 11) Deliverables (Artifacts)

- `docs/` → Bias Remediation playbooks, What‑If simulator guide, ZK Phase‑5 runbook or exit memo, M15 analytics spec, Residency medium‑risk SOP, Disclosure v2 RC guide.
- Dashboards: Predictive (bias/remediation), Trust (accel), Case Ops (campaign/ROI), Residency (auto‑apply), Disclosure (RC).
- Runbooks: “Remediation Gate & Simulator”, “Accel Steady‑State Ops”, “Campaign Analytics QA”, “Residency Staged Approvals”, “v2 RC Support”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-PRED-REMEDIATION`, `EPIC-ZK-ACCEL-PHASE5`, `EPIC-CASE-M15`, `EPIC-RESIDENCY-AUTOAPPLY-MED`, `EPIC-DISCLOSURE-2.0-RC`  
**Labels:** `bias-remediation`, `zk-accel`, `campaign-analytics`, `auto-apply-med`, `disclosure-v2-rc`  
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
POST /predict/remediation/suggest { modelId, thresholds }
POST /predict/remediation/whatif { modelId, changes }
POST /zk/accel/steady/enable { regions[] }
GET  /campaigns/analytics?caseId=...
POST /residency/autoapply/medium { fixId }
POST /disclosure/v2/partner/add { partnerId }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S34)

- Predictive: automated bias mitigation recommendations with human‑in‑the‑loop.
- ZK accel: steady‑state ops → cost optimizations.
- Case M16: campaign ROI → budget planner.
- Residency: high‑risk remediations (pilot).
- Disclosure v2: RC → GA plan.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S33 sprint plan drafted for planning review.

> Owner: PM — Sprint 33  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

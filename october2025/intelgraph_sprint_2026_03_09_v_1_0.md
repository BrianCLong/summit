# IntelGraph — Sprint 29 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-03-09_v1.0`  
**Dates:** Mar 9–Mar 20, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.03.r2` (flags default OFF → progressive enablement by cohort)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Consolidate recent launches and convert them into durable, low‑ops services: optimize **Predictive post‑GA**, execute **ZK Acceleration Phase‑1 rollout** (or complete wind‑down), ship **Case Spaces M11** (autopilot recommendations behind flags), complete **Residency Audits Wave 2**, and deliver **Disclosure v1.9** (enterprise MDM packaging + offline verify hardening).

**Definition of Victory (DoV):**

- Predictive GA operates with **error budget burn < 2%/week**, guardrail incidents auto‑paused within **≤2m**; governance scorecards auto‑generated for each weekly release.
- ZK Accel Phase‑1 enabled in **one region + one tenant cohort**, p95 verify ≤ 350ms with CPU fallback observed in drill; or wind‑down executed with CI/perf gates restored.
- Case M11 suggests **autopilot actions** (timing/layout/redaction hints) behind flags; approval gates enforced; measurable lift in stage A/B tests.
- Residency audits Wave 2 PASS for targeted tenants; exceptions have owners and target dates.
- Disclosure v1.9 packaged for **enterprise MDM** with configurable telemetry and offline verify prompts.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Predictive post‑GA: SLO tuning, guardrail incident response automation, scorecard auto‑publish.
- ZK Accel Phase‑1: rollout in controlled cohort; watchdogs; CPU fallback drill; cost alarms.
- Case M11: autopilot recommendation engine (flagged), human‑in‑the‑loop approval, audit trail.
- Residency: Wave‑2 third‑party audits; remediation tracking; report v2 export.
- Disclosure v1.9: MDM profiles (iOS/Android), offline cache TTL policy, verify UX hardening.

**Should**

- Cost Model v2.3 (post‑GA + accel ops + MDM bandwidth).
- Publisher UX polish for suggestion previews and rollback.

**Won’t (this sprint)**

- Predictive feature expansion; global ZK accel; mobile marketplace distribution.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Predictive **Post‑GA Optimization**

**A1. Guardrail Auto‑Pause & TTR**

- Incident detector → auto‑pause → alert → rollback macro. (5 pts)
- _Acceptance:_ Drill shows pause within ≤2m; rollback TTR ≤5m.

**A2. SLO & Budgets**

- Define SLOs (precision/recall windows, drift frequency); dashboards + alerts. (5 pts)
- _Acceptance:_ Dash green for a week on stage; alert policies documented.

**A3. Scorecard Auto‑Publish**

- Generate governance scorecards per model/version weekly; archive. (3 pts)
- _Acceptance:_ Three scorecards auto‑published; links in release notes.

### Epic B — ZK **Acceleration Phase‑1 (or Wind‑down)**

**B1. Cohort Enablement**

- Enable on region R1 + tenant cohort T1; flags; traffic monitors. (5 pts)
- _Acceptance:_ p95 verify ≤350ms; throughput + cost recorded.

**B2. Watchdogs & Fallback Drill**

- Anomaly detection; CPU fallback; rollback macro. (5 pts)
- _Acceptance:_ Drill triggers fallback; no SLO breach.

**B3. Decision Review**

- Keep/expand/pause decision memo with data; CI gate update. (3 pts)
- _Acceptance:_ Memo approved; CI reflects decision.

### Epic C — Case Spaces **M11 (Autopilot Recommendations — Flagged)**

**C1. Insights→Action Engine**

- Convert prior insights to recommended actions (send time/layout/redaction notes). (5 pts)
- _Acceptance:_ Top 3 flagged suggestions per narrative with confidence.

**C2. Approval & Rollback Flow**

- Human review, preview diff, one‑click apply, easy rollback. (5 pts)
- _Acceptance:_ Changes require approval; rollback restores prior state.

**C3. A/B Validation**

- Stage experiments; power calc; KPIs (open/verify/funnel time). (3 pts)
- _Acceptance:_ Two experiments run to completion; results exported.

### Epic D — Residency **Wave‑2 Third‑Party Audits**

**D1. Audit Pack v2** (5 pts) — improved report export (catalog IDs, plans, audits, exceptions).  
**D2. Findings Tracker** (3 pts) — owners/dates; dashboard roll‑up.  
**D3. Tenant Delivery** (2 pts) — signed reports distributed.

### Epic E — Disclosure **v1.9 (MDM Packaging + Verify UX)**

**E1. MDM Profiles & Policies** (5 pts) — deliver iOS/Android MDM profiles; config flags.  
**E2. Offline Verify UX Hardening** (3 pts) — cache TTL prompts; integrity warnings.  
**E3. Telemetry Controls** (2 pts) — opt‑in toggles; anonymized metrics.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Gov/Ops:_ predictive SLO/guardrail automation, residency audits v2
- _Trust Fabric:_ ZK accel cohort enablement, watchdogs/fallback, disclosure MDM
- _Graph Core:_ autopilot engine & approvals, A/B framework
- _Copilot/UX:_ scorecard views, suggestion previews, offline verify UX
- _QA/Release:_ drills (pause/rollback/fallback), audit pack QA, device policy tests

**Working Agreements**

- Any autopilot action requires **human approval** and must be **reversible**.
- ZK accel must have **CPU fallback** proven weekly while flags are ON.
- Scorecards are **release‑blocking** for predictive changes.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon Mar 9, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed Mar 11 (45m), Fri Mar 13 (30m).
- **Mid‑Sprint Demo & Risk:** Tue Mar 17 (30m).
- **Fallback Drill:** Thu Mar 19 (20m).
- **Review + Demo:** Fri Mar 20 (60m).
- **Retro:** Fri Mar 20 (30m).

---

## 6) Definition of Ready (DoR)

- Story ≤8 pts; flags named; datasets/cohorts; device policy matrix; dashboards linked; privacy notes attached.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; predictive SLOs green with auto‑pause drill PASS; ZK Phase‑1 decision recorded + CI updated; M11 autopilot flagged and validated via A/B; residency wave‑2 reports delivered; v1.9 MDM packages tested; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Predictive:** guardrail pause drill; SLO alert tests; scorecard generation.
- **ZK Accel:** p95/throughput/cost; fallback drill; CI gate check.
- **Case M11:** suggestion accuracy backtest; approval+rollback; A/B runs.
- **Residency:** audit export integrity; findings tracker; signed delivery.
- **Disclosure:** MDM install; offline verify TTL; telemetry toggles.

---

## 9) Metrics & Telemetry (Sprint)

- **Predictive:** incidents auto‑paused, rollback TTR, error budget burn.
- **Trust:** verify p95, fallback events, accel cost/proof.
- **Case Ops:** suggestion adoption, A/B lift, approval SLA.
- **Residency:** audits delivered, open exceptions, time‑to‑close.
- **Reliability/Cost:** error budget burn, ops cost deltas.

---

## 10) Risks & Mitigations

- **False positives on guardrails** → tuning window + manual override; post‑mortems.
- **Accel cost spikes** → tight alarms; CPU fallback; phased schedule.
- **Autopilot trust** → human approval, easy rollback, transparent logs.
- **MDM fragmentation** → limited device matrix, fallback CLI verify.

---

## 11) Deliverables (Artifacts)

- `docs/` → Predictive SLO & Guardrails, ZK Phase‑1 memo, M11 autopilot spec, Residency Audit Pack v2, Disclosure v1.9 MDM guide.
- Dashboards: Predictive (SLO/incidents), Trust (accel), Case Ops (autopilot/A‑B), Residency, Reliability/Cost.
- Runbooks: “Guardrail Auto‑Pause & Rollback”, “Accel Fallback Drill”, “Autopilot Approvals”, “Residency Audit Delivery”, “MDM Verify Support”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-PREDICTIVE-POST-GA`, `EPIC-ZK-ACCEL-PHASE1`, `EPIC-CASE-M11`, `EPIC-RESIDENCY-WAVE2`, `EPIC-DISCLOSURE-1.9`  
**Labels:** `predictive-slo`, `zk-accel`, `autopilot`, `residency-audit`, `mdm-verify`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**

```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:

- [ ] Behavior criteria…
- [ ] Guardrails/fallback validated…
- [ ] Approvals & audit trail attached…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches

```http
POST /predict/guardrails/pause { reason }
POST /zk/accel/enable { region, cohort }
POST /case/autopilot/apply { suggestionId }
GET  /residency/audit/report/v2?tenantId=...
GET  /verify/mdm/policy
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S30)

- Predictive: model registry v2 + bias review dashboards.
- ZK Accel: Phase‑2 (additional regions) or sunset plan.
- Case M12: autopilot → constrained auto‑apply for low‑risk changes.
- Residency: automated quarterly audit packs.
- Disclosure v2.0 planning.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S29 sprint plan drafted for planning review.

> Owner: PM — Sprint 29  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

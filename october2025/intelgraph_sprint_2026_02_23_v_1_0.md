# IntelGraph — Sprint 28 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-02-23_v1.0`  
**Dates:** Feb 23–Mar 6, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.03.r1` (flags default OFF → progressive cohort rollout)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Turn the last mile into launch: deliver **Predictive Suite Full GA (post‑canary)**, decide **ZK Acceleration Production Rollout** (or park), ship **Case Spaces M10** (distribution insights → optimization suggestions), complete **Residency 3P Conformance Audits**, and release **Disclosure v1.8** with **mobile verification kits**.

**Definition of Victory (DoV):**

- Predictive enabled for **all green cohorts**, with **guardrails**, **drift detectors**, and **kill‑switch macros** proven in prod.
- ZK acceleration has a **GO/NO‑GO** production decision with a **phased rollout plan** and CI perf gate updated accordingly.
- Case M10 suggests **audience/channel optimizations** (timing, layout, redaction clarity) and demonstrates measurable improvement on stage tests.
- Residency audits by a **third party** produce PASS reports for targeted tenants; exceptions have remediation owners/dates.
- Disclosure v1.8 mobile kits verify bundles **offline** on iOS/Android; telemetry captured.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Predictive GA rollout beyond canary: cohort scheduler, health gates, rollback readiness, governance sign‑offs.
- ZK Accel production plan: blast radius, capacity plan, runbooks, CI gate update.
- Case M10: optimization suggestions based on distribution analytics; experiment scaffolding (A/B) + KPIs.
- Residency: third‑party conformance audits; gap remediation plan; residency report export v2.
- Disclosure v1.8: mobile verify SDKs (WASM/native), offline cache/ttl policy, UX prompts, hashing & anchor checks.

**Should**

- Cost Model v2.2 (accel capacity + mobile verify bandwidth), publisher UX polish.

**Won’t (this sprint)**

- Predictive feature expansion; ZK bespoke hardware procurement; disclosure partner marketplace.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Predictive **Full GA**

**A1. Cohort Scheduler & Health Gates**

- Automate cohort enables; health checks; auto‑pause on guardrail incident. (5 pts)
- _Acceptance:_ Two cohorts auto‑enabled; incident triggers pause + alert.

**A2. Rollback & Kill‑Switch Cookbook (Prod)**

- Tested macros; TTR ≤ 5m; dashboard linkouts. (3 pts)
- _Acceptance:_ Dry‑run rollback meets TTR; audit trail stored.

**A3. Governance Sign‑Off & Scorecard Archive**

- Require signed scorecards; archive artifacts per model/version. (3 pts)
- _Acceptance:_ Enabler blocks without signed scorecard; archive export works.

### Epic B — ZK **Acceleration Production Decision**

**B1. Phased Rollout Plan**

- Regions/tenants phasing, feature flags, fallback, SLOs. (5 pts)
- _Acceptance:_ Plan approved; flags and dashboards wired.

**B2. Capacity & Cost Plan**

- Node sizing; autoscale; perf/$$ bands; saturation alarms. (5 pts)
- _Acceptance:_ Alarms fire on synthetic load; budget panel built.

**B3. CI Perf Gate Update + Safety**

- Update verify gate; CPU fallback; watchdog tests. (3 pts)
- _Acceptance:_ CI enforces new thresholds; fallback proven.

### Epic C — Case Spaces **M10 (Optimization Suggestions)**

**C1. Insights Engine**

- Analyze distribution analytics; propose timing/layout/redaction clarity tweaks. (5 pts)
- _Acceptance:_ Top 3 suggestions per narrative; confidence scores.

**C2. A/B Experiment Scaffolding**

- Variant definitions; randomizer; metrics & attribution. (5 pts)
- _Acceptance:_ Experiments run with power calc; results exported.

**C3. Suggestion → Action Flow**

- Apply suggestion, preview, approval gates; audit log. (3 pts)
- _Acceptance:_ Changes require approvals; rollback path present.

### Epic D — Residency **3P Conformance Audits**

**D1. Audit Pack & Evidence Export** (5 pts) — export data plans, policy catalog refs, audit parity bundles.  
**D2. Findings & Remediation Tracker** (3 pts) — assign owners/dates; dashboard.  
**D3. Report Archive & Tenant Delivery** (2 pts) — signed PDFs; per‑tenant portal link.

### Epic E — Disclosure **v1.8 (Mobile Verify Kits)**

**E1. iOS/Android SDKs** (5 pts) — offline verify (signatures, PCQ, redaction hash, anchors).  
**E2. Sample Apps & QA Matrix** (3 pts) — reference apps, device/os matrix.  
**E3. Telemetry & Privacy** (2 pts) — opt‑in usage telemetry; no PII leak check.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Gov/Ops:_ cohort scheduler, health gates, audit packs, remediation tracker
- _Trust Fabric:_ ZK accel plan, CI gates, mobile SDK core verify
- _Graph Core:_ insights engine, A/B scaffolding, suggestion→action flow
- _Copilot/UX:_ governance sign‑off UX, mobile UX prompts, suggestion preview
- _QA/Release:_ rollback drills, device matrix, audit pack QA

**Working Agreements**

- Predictive enablement only after **scorecard & governance sign‑off** present.
- ZK accel changes must have **fallback & watchdog** ready in prod.
- Suggestions cannot publish without **approval gates** and **redaction continuity** checks.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon Feb 23, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed Feb 25 (45m), Fri Feb 27 (30m).
- **Mid‑Sprint Demo & Risk:** Tue Mar 3 (30m).
- **Rollback Drill:** Thu Mar 5 (20m).
- **Review + Demo:** Fri Mar 6 (60m).
- **Retro:** Fri Mar 6 (30m).

---

## 6) Definition of Ready (DoR)

- Story ≤8 pts; flags; datasets & cohorts; device matrix; privacy notes; dashboards updated.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; predictive cohorts enabled as planned (or rollback documented); ZK accel decision complete + CI gate updated; M10 insights & A/B shipped; residency 3P audits delivered; mobile SDKs verified offline; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Predictive:** cohort scheduler sim; guardrail incident pause; rollback macro TTR.
- **ZK Accel:** saturation + cost alarms; CI gate pass; watchdog rollback.
- **Case M10:** suggestion accuracy backtest; A/B sample size calc; approval gates.
- **Residency:** audit export integrity; remediation tracker; signed report delivery.
- **Disclosure:** device lab verify offline; hash/anchor mismatch prompts.

---

## 9) Metrics & Telemetry (Sprint)

- **Predictive:** cohorts enabled, incident pauses, rollback TTR.
- **Trust:** CI perf thresholds met, accel watchdog events, SDK verify success.
- **Case Ops:** suggestion adoption, A/B lifts, approval SLA.
- **Residency:** audits delivered, open findings count, remediation on‑time %.
- **Reliability/Cost:** error budget burn, accel & mobile kit cost deltas.

---

## 10) Risks & Mitigations

- **Cohort rollouts stall** → auto‑pause + alert; manual override; staged enable.
- **Accel cost creep** → budget alarms; autoscale limits; CPU fallback.
- **Suggestion bias** → confidence bands; human review; rollbacks.
- **Mobile fragmentation** → QA matrix; fallback CLI verify.

---

## 11) Deliverables (Artifacts)

- `docs/` → Predictive GA cookbook; ZK accel production plan; M10 insights spec; Residency 3P audit pack; Mobile SDKs guide.
- Dashboards: Predictive (cohorts/health), Trust (CI/accel), Case Ops (insights/A-B), Residency (audits), Reliability/Cost.
- Runbooks: “Cohort Scheduler Ops”, “Accel Watchdog & Fallback”, “Insights A/B Ops”, “3P Audit Delivery”, “Mobile Verify Support”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-PREDICTIVE-GA`, `EPIC-ZK-ACCEL-PROD`, `EPIC-CASE-M10`, `EPIC-RESIDENCY-3P`, `EPIC-DISCLOSURE-1.8`  
**Labels:** `predictive-ga`, `zk-accel`, `case-insights`, `residency-audit`, `mobile-verify`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**

```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:

- [ ] Behavior criteria…
- [ ] Guardrails/fallback validated…
- [ ] Approvals & sign‑offs attached…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches

```http
POST /predict/cohorts/schedule { plan }
POST /zk/accel/rollout { phase }
GET  /case/insights/suggestions?caseId=...
GET  /residency/audit/report?tenantId=...
GET  /verify/mobile/sdk/version
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S29)

- Predictive post‑GA optimizations; model registry v2.
- ZK accel roll‑forward (phase 1) or wind‑down.
- Case M11: insights → autopilot recommendations (behind flags).
- Residency audits wave 2; partner attestations QA.
- Disclosure v1.9: enterprise MDM packaging.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S28 sprint plan drafted for planning review.

> Owner: PM — Sprint 28  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

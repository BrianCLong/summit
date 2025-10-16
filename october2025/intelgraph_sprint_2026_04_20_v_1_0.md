# IntelGraph — Sprint 32 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-04-20_v1.0`  
**Dates:** Apr 20–May 1, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.05.r1` (flags default OFF → progressive enablement by cohort)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Operationalize governance at scale and ready the next wave for partners: ship **Registry‑driven Cohort Scheduler** for predictive, advance **ZK Acceleration Phase‑4** (or complete Sunset + post‑mortem), deliver **Case Spaces M14** (orchestration → campaign scheduling), enable **Residency Auto‑Apply (opt‑in) for low‑risk fixes**, and move **Disclosure v2.0 to Beta** (viewer/signer hardening + partner pilot kickoff).

**Definition of Victory (DoV):**

- Cohort enables/pauses occur **automatically** per **registry policies** (approvals/scorecards/bias) with kill‑switch macros validated.
- ZK Accel either expands to **broad cohorts** under Phase‑4 SLOs or clean **sunset** is executed with post‑mortem + CI gates restored.
- Case M14 schedules **multi‑case campaigns** (timed publishes per audience) with rollback windows.
- Residency low‑risk remediations **auto‑apply** behind flags (routing/policy toggles) with human approval path.
- Disclosure v2.0 **Beta**: viewer & signer hardened; partner pilot enabled for two design partners; migration tool covers ≥90% of v1 bundles.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Predictive: **Registry Cohort Scheduler** (policies → enables/pauses), health gates, guardrail telemetry.
- ZK Accel: **Phase‑4** rollout (or Sunset post‑mortem), watchdogs, budget caps, CI perf gates.
- Case M14: campaign scheduler (per audience/timezone), blackout windows, approvals.
- Residency: low‑risk **auto‑apply** engine (opt‑in) for routing/policy toggles + audit; guardrails to block risky cascades.
- Disclosure v2.0: **Beta hardening** (perf, offline, anchor rotation), partner pilot plumbing (keys, trust store, telemetry).

**Should**

- Cost Model v2.6 (scheduler ops, Phase‑4 accel, residency auto‑apply, v2 beta signing).
- Publisher UX polish for campaign calendar and rollback.

**Won’t (this sprint)**

- Predictive feature expansion; ZK bespoke hardware procurement; Disclosure v2 GA.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Predictive **Registry Cohort Scheduler**

**A1. Policy‑to‑Schedule Engine**

- Translate registry gates (approvals/scorecards/bias) into cohort enable/hold rules. (8 pts)
- _Acceptance:_ Two cohorts auto‑enabled; one held due to missing gate; events logged.

**A2. Health Gates & Auto‑Pause**

- Incident → pause → rollback macro; dashboards. (5 pts)
- _Acceptance:_ Drill pauses within ≤2m; TTR ≤5m.

**A3. Audit & Comms Hooks**

- Publish enable/hold decisions to release notes + Slack/email hooks. (3 pts)
- _Acceptance:_ Two decisions posted with artifact links.

### Epic B — ZK **Acceleration Phase‑4 (or Sunset + Post‑mortem)**

**B1. Broad Cohort Enable (or Disable)**

- Flags, monitors, budgets; region adds; watchdog drills. (8 pts)
- _Acceptance:_ p95 verify ≤ 320ms; fallback drills PASS; or sunset flags OFF & CI gates restored.

**B2. Post‑Mortem & Lessons (if Sunset)**

- Root causes, cost/benefit, future options; runbook changes. (3 pts)

**B3. Cost & Capacity Guardrails**

- Saturation alarms; autoscale limits; budget panel. (3 pts)

### Epic C — Case Spaces **M14 (Campaign Scheduling)**

**C1. Calendar & Timezones**

- Per‑audience schedule; user timezones; blackout windows. (5 pts)
- _Acceptance:_ Calendar renders; conflict warnings; ICS export.

**C2. Approval & Rollback Windows**

- Pre‑publish approvals; timed rollback window; audit. (5 pts)
- _Acceptance:_ Publish blocked without approvals; rollback within window restores state.

**C3. Dependency Checks**

- Ensure disclosure/redaction continuity and case links before schedule. (3 pts)
- _Acceptance:_ Violations block schedule with reasons.

### Epic D — Residency **Auto‑Apply (Opt‑in)**

**D1. Low‑Risk Fix Library** (5 pts) — routing to in‑region replica, toggling non‑destructive policy flags.

**D2. Approval & Audit** (3 pts) — human approval gate; full audit trail; revert button.

**D3. Cascade Guardrails** (2 pts) — detect multi‑tenant side‑effects, require manual handoff.

### Epic E — Disclosure **v2.0 Beta (Partner Pilot)**

**E1. Viewer/Signer Hardening** (5 pts) — perf budgets, offline verify, anchor rotation.

**E2. Partner Plumbing** (3 pts) — keys/trust store onboarding, pilot telemetry.

**E3. Migration Coverage** (2 pts) — converter handles ≥90% v1 variants; gap report.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Gov/Ops:_ scheduler policies, residency auto‑apply, partner keys/trust
- _Trust Fabric:_ ZK Phase‑4 or sunset, v2 beta hardening, CI gates
- _Graph Core:_ campaign scheduler, dependency checks, approvals/rollback
- _Copilot/UX:_ scheduler decision surfaces, calendar UX, partner prompts
- _QA/Release:_ drills, migration coverage, rollback tests

**Working Agreements**

- No cohort enable without **registry gate PASS**.
- Auto‑apply runs behind **opt‑in flag** + human approval; every change **reversible**.
- Campaign schedules require **dependency checks** (disclosures/redactions/links) GREEN.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon Apr 20, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed Apr 22 (45m), Fri Apr 24 (30m).
- **Mid‑Sprint Demo & Risk:** Tue Apr 28 (30m).
- **Rollback Drill:** Thu Apr 30 (20m).
- **Review + Demo:** Fri May 1 (60m).
- **Retro:** Fri May 1 (30m).

---

## 6) Definition of Ready (DoR)

- Story ≤8 pts; flags named; cohorts/regions enumerated; calendar/blackout windows; partner keys; dashboards wired; privacy notes updated.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; scheduler makes automated decisions; ZK Phase‑4 or Sunset executed; M14 scheduling shipped with approvals/rollback; residency auto‑apply live (opt‑in) with guardrails; v2 beta hardened & partner pilot online; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Scheduler:** missing‑gate hold, auto‑enable, auto‑pause drill.
- **ZK:** p95/throughput/cost; fallback drills; CI gates.
- **Case M14:** timezone correctness; blackout conflict; rollback window.
- **Residency:** fix library unit tests; cascade guard; revert.
- **Disclosure:** offline verify + rotation; migration coverage harness.

---

## 9) Metrics & Telemetry (Sprint)

- **Predictive:** cohorts auto‑enabled/held, incident pauses, TTR.
- **Trust:** verify p95, fallback events, accel cost delta.
- **Case Ops:** scheduled publishes, rollback frequency, dependency violations.
- **Residency:** fixes proposed/applied/reverted, cascade blocks.
- **Disclosure:** v2 verify success, migration coverage %, pilot partner health.
- **Reliability/Cost:** error budget burn, ops cost deltas.

---

## 10) Risks & Mitigations

- **Scheduler false holds** → dry‑run mode; clear denial messages.
- **Accel budget spikes** → budget alarms; autoscale limits; CPU fallback.
- **Scheduling mishaps** → blackout windows; rollback window; preflight checks.
- **Auto‑apply cascades** → cascade guardrails; manual handoff.
- **Partner pilot friction** → concierge onboarding; trust store tooling.

---

## 11) Deliverables (Artifacts)

- `docs/` → Scheduler spec, Phase‑4/Sunset memo, M14 campaign spec, Residency Auto‑Apply SOP, Disclosure v2 Beta guide & pilot runbook.
- Dashboards: Predictive (scheduler/gates), Trust (accel), Case Ops (campaigns), Residency (auto‑apply), Disclosure (pilot).
- Runbooks: “Scheduler Decisions”, “Accel Fallback”, “Campaign Rollback”, “Residency Revert”, “v2 Pilot Support”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-PRED-SCHEDULER`, `EPIC-ZK-ACCEL-PHASE4`, `EPIC-CASE-M14`, `EPIC-RESIDENCY-AUTOAPPLY`, `EPIC-DISCLOSURE-2.0-BETA`  
**Labels:** `scheduler`, `zk-accel`, `campaigns`, `auto-apply`, `disclosure-v2`, `partner-pilot`  
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
POST /scheduler/predictive/apply { cohortPolicy }
POST /zk/accel/phase4/enable { regions[], cohorts[] }
POST /campaigns/schedule { caseIds[], audiences[], times[] }
POST /residency/autoapply { fixId }
POST /disclosure/v2/pilot/register { partnerId, keys }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S33)

- Predictive: bias remediation flows; scheduler what‑if simulator.
- ZK accel: Phase‑5 or steady‑state ops.
- Case M15: campaign analytics + ROI insights.
- Residency: auto‑apply med‑risk with staged approvals.
- Disclosure v2: partner pilot expansion; beta → RC.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S32 sprint plan drafted for planning review.

> Owner: PM — Sprint 32  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

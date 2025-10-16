# IntelGraph — Sprint 31 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-04-06_v1.0`  
**Dates:** Apr 6–Apr 17, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.04.r2` (flags default OFF → progressive enablement by cohort)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal

Harden governance and scale what works: enforce **Registry‑driven rollout policies** for predictive, progress **ZK Acceleration Phase‑3** (or finalize Sunset), ship **Case Spaces M13** (multi‑case orchestration + compliance bundles), automate **Residency exception remediation suggestions**, and move **Disclosure v2.0** from RFC to **prototype viewer + signer**.

**Definition of Victory (DoV):**

- Predictive releases are blocked unless they pass **registry policy gates** (approvals, datasets, scorecards, bias checks) with cohort policies enforced.
- ZK Accel either expands to **two additional cohorts + one region** under Phase‑3 SLOs **or** completes final Sunset without regressions.
- Case M13 lets users orchestrate **multi‑case narratives** and produce **compliance bundles** with lineage and redaction continuity.
- Residency engine proposes **remediation suggestions** with owners/dates and auto‑creates JQL/GitHub issues.
- Disclosure v2.0 **prototype viewer and signer** verify dual anchors, read v2 schema, and generate migration test bundles.

---

## 2) Scope (Must/Should/Won’t)

**Must**

- Predictive: Registry policy **gates** (approvals, datasets, scorecards, bias threshold) + **rollout policies** per cohort/region.
- ZK Accel: Phase‑3 enablement or Sunset close‑out; watchdogs, fallback drills, CI gates.
- Case M13: multi‑case orchestration (select cases, merge timelines), **compliance bundle** export (docs + proofs + manifests).
- Residency: remediation suggestion generator (rule mapping → fix), issue auto‑creation, dashboard roll‑up.
- Disclosure v2.0: prototype **viewer** (desktop/web) + **signer** (CLI/service), schema v2 compliance, migration tool.

**Should**

- Cost Model v2.5 (Phase‑3 accel + remediation ops + v2.0 signing), Publisher UX polish for orchestration.

**Won’t (this sprint)**

- Predictive feature expansion; ZK bespoke hardware; Disclosure v2.0 full GA.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Predictive **Registry‑Driven Rollout Policies**

**A1. Policy Gates in Registry**

- Approvals/dataset lineage/scorecard/bias checks as hard gates; APIs for CI. (8 pts)
- _Acceptance:_ Release gate fails without all checks; denial reasons logged.

**A2. Cohort/Region Rollout Policies**

- Define policies per cohort/region (health gates, kill‑switch defaults). (5 pts)
- _Acceptance:_ Two policies applied; auto‑pause on incident proven.

**A3. Governance Audit Export**

- Export JSON/PDF of gates passed + artifacts; link in release notes. (3 pts)
- _Acceptance:_ Exports attached to two releases.

### Epic B — ZK **Acceleration Phase‑3 (or Sunset)**

**B1. Enablement (R4 + two cohorts)**

- Flags + monitors; perf SLOs; cost alarms. (8 pts)
- _Acceptance:_ p95 verify ≤ 330ms; watchdog drills pass; cost within budget.

**B2. Sunset Close‑out (if applicable)**

- Decommission, restore CI gates, remove dead code/flags; TCO wrap‑up. (5 pts)
- _Acceptance:_ All flags OFF; CI/alerts green; report archived.

**B3. Decision Record & Runbooks**

- Memo + runbooks updated; on‑call guide. (3 pts)

### Epic C — Case Spaces **M13 (Multi‑Case Orchestration + Compliance Bundles)**

**C1. Cross‑Case Orchestration**

- Select cases; merge timelines; conflict markers; provenance preserved. (8 pts)
- _Acceptance:_ Orchestrated timeline export with diffs; broken link detector clean.

**C2. Compliance Bundle Export**

- Export package (narrative, disclosures, PCQ, policy refs, redaction hashes). (5 pts)
- _Acceptance:_ External validator PASS; revocation honored.

**C3. Reviewer Gates & SLA**

- Approvals per audience; SLA timers; audit. (3 pts)
- _Acceptance:_ Export blocked until approvals; SLA breach alerts.

### Epic D — Residency **Remediation Suggestions**

**D1. Rule→Fix Mapping Engine** (5 pts) — map violations to concrete remediations (policy change, routing, hold).

**D2. Issue Auto‑Creation** (3 pts) — create Jira/GitHub issues with owners/dates.

**D3. Dashboard Roll‑up** (2 pts) — show open remediations, due dates, closure rate.

### Epic E — Disclosure **v2.0 Prototype (Viewer + Signer)**

**E1. v2 Viewer (Desktop/Web)** (5 pts) — parse v2 schema; dual‑anchor verify; redaction rule continuity.

**E2. v2 Signer (CLI/Service)** (5 pts) — sign bundles; include anchors; produce migration artifacts.

**E3. Migration Tooling** (2 pts) — alpha→v2 converter; report diffs & compatibility.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements

**Swimlanes**

- _Gov/Ops:_ registry gates, rollout policies, remediation engine
- _Trust Fabric:_ ZK phase‑3/sunset, v2 viewer/signer, CI gates
- _Graph Core:_ orchestration, compliance bundles, approvals
- _Copilot/UX:_ policy denial clarity, orchestration previews, viewer UX
- _QA/Release:_ drills, export validation, migration tests

**Working Agreements**

- No predictive release without **registry gate PASS** + rollout policy defined.
- ZK accel changes require **fallback drills** each week while enabled.
- Compliance bundle exports must include **redaction hashes** and **policy references**.

---

## 5) Ceremonies & Calendar

- **Planning:** Mon Apr 6, 90m.
- **Stand‑ups:** 9:30–9:40 MT daily.
- **Grooming:** Wed Apr 8 (45m), Fri Apr 10 (30m).
- **Mid‑Sprint Demo & Risk:** Tue Apr 14 (30m).
- **Fallback Drill (if accel ON):** Thu Apr 16 (20m).
- **Review + Demo:** Fri Apr 17 (60m).
- **Retro:** Fri Apr 17 (30m).

---

## 6) Definition of Ready (DoR)

- Story ≤8 pts; flags named; cohorts/regions listed; datasets & scorecards linked; dashboards wired; privacy notes updated.

## 7) Definition of Done (DoD)

- Tests ≥ 90%; registry gates enforced; ZK phase‑3 or sunset executed; M13 orchestration + compliance bundles shipped; remediation engine live; v2 viewer/signer prototypes verified; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures

- **Registry:** gate negative tests; rollout policy auto‑pause; audit export.
- **ZK:** p95/throughput/cost; fallback drills; CI status.
- **Case M13:** orchestration merge accuracy; compliance validator PASS; approvals + SLA alerts.
- **Residency:** suggestion accuracy; issue creation; dashboard roll‑up.
- **Disclosure:** v2 parse/verify; migration converter diffs; offline verify.

---

## 9) Metrics & Telemetry (Sprint)

- **Predictive:** releases via registry, gate failure reasons, auto‑pause incidents.
- **Trust:** verify p95, fallback events, accel cost delta.
- **Case Ops:** orchestration adoption, compliance bundle exports, approval SLA.
- **Residency:** suggestions created/closed, time‑to‑close.
- **Disclosure:** v2 viewer verify success, migration conversion rate.
- **Reliability/Cost:** error budget burn, signing/accel cost deltas.

---

## 10) Risks & Mitigations

- **Gate friction** → clear denial messages; docs; dry‑run mode.
- **Accel instability** → phased schedule; CPU fallback; budget alarms.
- **Orchestration conflicts** → visual diff + conflict markers; rollback.
- **Remediation false positives** → require human review; feedback loop.
- **v2 schema churn** → feature flags; converter keeps parity.

---

## 11) Deliverables (Artifacts)

- `docs/` → Registry Gates & Rollout Policies, ZK Phase‑3/Sunset memo, M13 orchestration & compliance spec, Residency Remediation SOP, Disclosure v2.0 prototype notes.
- Dashboards: Predictive (gates/incidents), Trust (accel), Case Ops (orchestration/compliance), Residency (remediation), Reliability/Cost.
- Runbooks: “Registry Gate Failures”, “Accel Fallback”, “Compliance Bundle QA”, “Remediation Workflow”, “v2 Sign/Verify”.

---

## 12) Jira Scaffolds & Labels

**Epics:** `EPIC-PRED-REGISTRY-POLICY`, `EPIC-ZK-ACCEL-PHASE3`, `EPIC-CASE-M13`, `EPIC-RESIDENCY-REMEDIATION`, `EPIC-DISCLOSURE-2.0-PROTOTYPE`  
**Labels:** `registry-gates`, `rollout-policy`, `zk-accel`, `orchestration`, `compliance-bundle`, `residency-fix`, `disclosure-v2`  
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
POST /registry/policies/validate { modelId, cohort }
POST /zk/accel/enable { region, cohort }
POST /cases/orchestrate { caseIds[] }
POST /residency/remediate/suggest { violations[] }
POST /disclosure/v2/sign { bundleId }
GET  /disclosure/v2/verify { bundleId }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S32)

- Predictive: registry‑driven cohort scheduler; bias remediation suggestions.
- ZK accel: Phase‑4 or post‑mortem & wind‑down lessons.
- Case M14: orchestration → campaign scheduling.
- Residency: auto‑apply simple remediation (opt‑in).
- Disclosure v2.0: beta viewer & signer hardening, partner pilot.

---

## 15) Versioning & Change Log

- **v1.0 (2025‑09‑29)** — Initial S31 sprint plan drafted for planning review.

> Owner: PM — Sprint 31  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead

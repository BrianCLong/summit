# IntelGraph — Sprint 30 Plan (v1.0)

**Slug:** `intelgraph-sprint-2026-03-23_v1.0`  
**Dates:** Mar 23–Apr 3, 2026 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2026.04.r1` (flags default OFF → progressive enablement by cohort)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Stabilize post‑launch operations and pave next‑quarter foundations: optimize **Predictive GA** with **Model Registry v2** and bias dashboards, execute **ZK Acceleration Phase‑2** (or Sunset), deliver **Case Spaces M12** (low‑risk auto‑apply behind flags), automate **Residency Quarterly Audit Packs**, and publish **Disclosure v2.0 RFC** (scope + migration).

**Definition of Victory (DoV):**
- Model Registry v2 controls **versioning, approvals, datasets, scorecards**; releases blocked without approvals.
- ZK Accel **Phase‑2** enabled in two additional regions/cohorts **or** Sunset executed with clean rollback and CI gates restored.
- Case M12 auto‑applies **low‑risk optimizations** (timing/layout) with human override; zero critical incidents in stage.
- Residency **Quarterly Audit Pack** generated automatically with tenant delivery flows.
- Disclosure v2.0 RFC reaches **stakeholder sign‑off** with migration plan and compatibility table.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- Predictive: **Model Registry v2** (artifacts, approvals, lineage), bias & fairness dashboards, policy hooks.
- ZK Accel: Phase‑2 rollout plan (regions R2/R3) **or** Sunset plan; watchdogs, CPU fallback, budgets.
- Case M12: **Auto‑apply (flagged) for low‑risk suggestions**, approval override, full audit.
- Residency: **Quarterly Audit Pack automation**, report v3 (catalog refs, residency proofs, diffs vs last quarter).
- Disclosure v2.0: RFC with scope (anchors, viewer attestation federation, mobile kits), schema draft, migration plan.

**Should**
- Cost Model v2.4 (accel footprint + verify bandwidth + audit automation); Publisher UX polish.

**Won’t (this sprint)**
- Broad autopilot for high‑risk changes; ZK bespoke hardware procurement; Disclosure v2.0 implementation.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Predictive **Model Registry v2 + Bias Dashboards**
**A1. Registry Core & APIs**  
- Register models, datasets, eval reports, scorecards; immutable artifact IDs; approvals. (8 pts)  
- *Acceptance:* Release gate fails without approved registry entry.

**A2. Lineage & Provenance**  
- Link model ↔ dataset ↔ eval ↔ scorecard; diff view across versions. (5 pts)  
- *Acceptance:* Lineage graph renders; diffs exportable.

**A3. Bias/Fairness Dashboards**  
- Slice metrics, parity gaps, trend lines; alerts. (5 pts)  
- *Acceptance:* Dash live; alert policy proven on synthetic drift.

### Epic B — ZK **Acceleration Phase‑2 (or Sunset)**
**B1. Phase‑2 Enablement**  
- Rollout to R2/R3 + cohorts; SLOs; saturation alarms. (8 pts)  
- *Acceptance:* p95 verify ≤ 340ms; fallback drills PASS.

**B2. Sunset Plan (if NO‑GO)**  
- Disable flags; decommission nodes; restore CI gates; cost close‑out. (5 pts)  
- *Acceptance:* All flags OFF; CI/alerts clean; TCO report archived.

**B3. Decision Record**  
- Data‑backed memo; board sign‑off; runbook updates. (3 pts)

### Epic C — Case Spaces **M12 (Constrained Auto‑Apply — Flagged)**
**C1. Risk Classifier**  
- Classify suggestions as low/med/high risk; only low risk eligible. (5 pts)  
- *Acceptance:* Classifier precision ≥ 0.9 on fixtures; manual override path present.

**C2. Auto‑Apply Engine**  
- Apply low‑risk changes; preview; rollback; full audit. (5 pts)  
- *Acceptance:* Auto‑applies succeed; rollback restores prior state; audit complete.

**C3. Safeguards & Rate Limits**  
- Per‑case limits; cooldowns; SLA impact checks. (3 pts)  
- *Acceptance:* Limits enforced; SLA unaffected in stage.

### Epic D — Residency **Quarterly Audit Pack Automation**
**D1. Pack Generator v1** (5 pts) — schedule, compile reports, sign PDFs per tenant.  
**D2. Exception Diff & Owners** (3 pts) — diff vs last quarter; owners & due dates.  
**D3. Tenant Delivery & Archive** (2 pts) — portal delivery; archive index.

### Epic E — Disclosure **v2.0 RFC**
**E1. Schema & Anchors** (5 pts) — schema draft, dual‑anchor strategy, compatibility.  
**E2. Viewer Federation Plan** (3 pts) — issuer trust + rotation; mobile/desktop parity.  
**E3. Migration & Back‑compat** (2 pts) — plan, gates, deprecation timeline.

> **Sprint Point Budget:** 76 pts (Graph Core 24, Trust Fabric 26, Copilot/UX 10, Gov/Ops 11, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~75±8 pts; green.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Gov/Ops:* audit pack automation, delivery & archive, registry gates
- *Trust Fabric:* ZK phase‑2 or sunset, RFC schema, watchdogs/fallbacks
- *Graph Core:* auto‑apply engine, risk classifier, lineage graphs
- *Copilot/UX:* bias dashboards, previews, approval/override UX
- *QA/Release:* drills, registry release gate tests, automation QA

**Working Agreements**
- No predictive release without **approved registry entry** + scorecard.  
- Auto‑apply runs **behind flags** and limited to **low‑risk** class; changes are **reversible**.  
- ZK accel changes require **fallback drills** weekly while enabled.

---

## 5) Ceremonies & Calendar
- **Planning:** Mon Mar 23, 90m.  
- **Stand‑ups:** 9:30–9:40 MT daily.  
- **Grooming:** Wed Mar 25 (45m), Fri Mar 27 (30m).  
- **Mid‑Sprint Demo & Risk:** Tue Mar 31 (30m).  
- **Fallback Drill (if accel ON):** Thu Apr 2 (20m).  
- **Review + Demo:** Fri Apr 3 (60m).  
- **Retro:** Fri Apr 3 (30m).

---

## 6) Definition of Ready (DoR)
- Story ≤8 pts; flags; cohorts/regions; dataset slices; dashboards wired; privacy notes updated.

## 7) Definition of Done (DoD)
- Tests ≥ 90%; registry gates enforced; bias dashboards/alerts live; ZK phase‑2 or sunset decision executed; M12 auto‑apply validated; quarterly audit packs delivered; RFC v2.0 signed; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Registry:** release gating negative test; lineage diffs; approval workflow.  
- **ZK:** p95/throughput/cost; fallback drills; CI gate status.  
- **Case M12:** classifier accuracy; auto‑apply/rollback; rate limits.  
- **Residency:** scheduled pack generation; exception diff; portal delivery.  
- **Disclosure:** schema lint; compat matrix; migration gates.

---

## 9) Metrics & Telemetry (Sprint)
- **Predictive:** releases via registry, scorecard coverage, bias alert count.  
- **Trust:** verify p95, fallback events, accel cost delta.  
- **Case Ops:** auto‑apply adoption, rollback rate, SLA effects.  
- **Residency:** packs generated, open exceptions, time‑to‑close.  
- **Reliability/Cost:** error budget burn, audit automation cost delta.

---

## 10) Risks & Mitigations
- **Registry friction** → templates + importers; clear denial messages.  
- **Auto‑apply errors** → strict low‑risk filter; easy rollback; rate limits.  
- **Accel instability/cost** → phased rollout; CPU fallback; budget alarms.  
- **Audit generator brittleness** → snapshot inputs; retry & alerts.

---

## 11) Deliverables (Artifacts)
- `docs/` → Model Registry v2 spec; Bias Dashboards guide; ZK Phase‑2/Sunset memo; Case M12 auto‑apply spec; Residency Quarterly Pack SOP; Disclosure v2.0 RFC.  
- Dashboards: Predictive (bias/drift), Trust (accel), Case Ops (auto‑apply), Residency (packs), Reliability/Cost.  
- Runbooks: “Registry Release Gate”, “Accel Fallback”, “Auto‑apply Overrides”, “Quarterly Audit Pack Ops”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-PRED-REGISTRY-V2`, `EPIC-ZK-ACCEL-PHASE2`, `EPIC-CASE-M12`, `EPIC-RESIDENCY-QTR`, `EPIC-DISCLOSURE-2.0-RFC`  
**Labels:** `registry-v2`, `bias-dashboard`, `zk-accel`, `auto-apply`, `residency-audit`, `disclosure-v2.0`  
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
POST /registry/models { artifact, datasetId, evalIds[] }
GET  /registry/lineage/{modelId}
POST /zk/accel/enable { region, cohort }
POST /case/autoapply/run { caseId }
POST /audit/quarterly/generate { quarter }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S31)
- Predictive: registry‑driven rollout policies; bias‑aware alerts to governance panel.  
- ZK accel: Phase‑3 or optimization backlog.  
- Case M13: multi‑case orchestration; compliance bundles.  
- Residency: automated exception remediation suggestions.  
- Disclosure v2.0: prototype viewer + signer.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial S30 sprint plan drafted for planning review.

> Owner: PM — Sprint 30  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead


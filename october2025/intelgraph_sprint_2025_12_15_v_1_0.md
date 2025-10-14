# IntelGraph — Sprint 23 Plan (v1.0)

**Slug:** `intelgraph-sprint-2025-12-15_v1.0`  
**Dates:** Dec 15–Dec 26, 2025 (**US holiday Dec 25**)  
**Cadence:** 2 weeks (holiday‑impacted)  
**Release Train:** `2026.01.r1` (targets early Jan release; feature flags default OFF)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Elevate federation writes to **tenant‑ready GA**, stabilize **ZK recursion** for governed access proofs, and ship **Case Spaces M5** (narrative export + task workflows). Advance **Predictive Suite** via **A/B ranker experiments** under governance, and anchor **Disclosure v1.3** with notarization.

**Definition of Victory (DoV):**
- Federation write path enforces **tenant isolation**, **compensating actions**, and **audit parity**; chaos rollback proven.
- ZK recursion passes **stability suite** with deterministic verification and budgeted latency.
- Case M5 exports **narratives** (timeline→storyboard→report) with linked evidence; task workflows live.
- Predictive A/B shows measurable lift **without policy violations**; explainers logged.
- Disclosure v1.3 includes **notarization anchors** verifiable independently.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- Federation Write **Tenant GA**: isolation, compensating actions, contention/backoff, multi‑tenant caps.
- ZK Recursion **Stabilization**: reproducible proofs, side‑channel checklist, perf guardrails.
- Case Spaces **M5**: narrative export, task workflow states/SLAs, cross‑link to disclosures.
- Predictive **A/B Experiments**: ranker variants, governance panel, opt‑in telemetry.
- Disclosure **v1.3**: notarization anchors (timestamping/PKI), viewer verification path.

**Should**
- Cost Model v1.3 (write amp + retries); Partner Replay Kit refresh.

**Won’t (this sprint)**
- Federation multi‑region writes; ZK batched recursion GA; predictive GA; disclosure mobile kits.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Federation Write **Tenant GA**
**A1. Tenant Isolation & Caps**  
- Enforce per‑tenant write ceilings; row/column scope enforcement; noisy‑neighbor backoff. (8 pts)  
- *Acceptance:* Over‑cap blocks with policy ID; backoff metrics visible.

**A2. Compensating Actions**  
- Define reversible operations; auto‑generate undo plans for safe mutations. (8 pts)  
- *Acceptance:* Chaos mid‑TX → automatic compensation; audit shows before/after.

**A3. Contention Control + Retry**  
- Deadlock/timeouts → jittered retries; idempotency maintained. (5 pts)  
- *Acceptance:* Load test with induced contention passes within SLO.

**A4. Multi‑Tenant Audit Parity**  
- Record plan/cost/proof per tenant; exportable audit bundle. (3 pts)  
- *Acceptance:* External audit replays GA scenarios with PASS.

### Epic B — ZK Recursion **Stabilization**
**B1. Determinism & Tolerance Suite**  
- Repeatability tests; cross‑arch verification; fixed CRS handling. (5 pts)  
- *Acceptance:* 100 runs produce identical verifier results; tolerance bounds documented.

**B2. Side‑Channel Checklist & Mitigations**  
- Review timing/memory channels; constant‑time hotspots; logging hygiene. (5 pts)  
- *Acceptance:* Checklist signed; alerts on risky configs.

**B3. Perf Guardrails**  
- Budget p95 verify < 450ms aggregate; batch sizes tuned; cache priming. (3 pts)  
- *Acceptance:* Stage soak meets budgets; regressions page.

### Epic C — Case Spaces **M5**
**C1. Narrative Export**  
- Compose case narrative from storyboard tracks; citations to evidence; court/press templates. (8 pts)  
- *Acceptance:* PDFs pass legibility + provenance checks; diffs explain changes.

**C2. Task Workflows & SLAs**  
- States (ToDo/In Prog/Blocked/Review/Done), assignees, due, SLA timers; bulk ops. (5 pts)  
- *Acceptance:* Burndown visible; SLA breach alerts; bulk edit audited.

**C3. Disclosure Cross‑Links**  
- Narrative sections link to disclosure artifacts; redaction awareness. (3 pts)  
- *Acceptance:* Broken link detector; export refuses if link invalid.

### Epic D — Predictive Suite **A/B Under Governance**
**D1. Variant Scaffold** (3 pts) — two rankers behind flags; traffic split; seed control.  
**D2. Governance Panel** (3 pts) — feature whitelist, denial explainer, opt‑in logging terms.  
**D3. Lift Measurement** (3 pts) — success metrics (time‑to‑hypothesis, action rate) with guardrail monitors.

### Epic E — Disclosure **v1.3** (Notarization Anchors)
**E1. Timestamping/PKI Anchors** (5 pts) — include RFC3161/PKI stamp in bundle manifest.  
**E2. Viewer Verify Path** (3 pts) — validate anchors offline; warning UX + retry guidance.  
**E3. Anchor Registry** (3 pts) — registry of stamps; rotation & revocation doc.

> **Sprint Point Budget:** **64 pts** (holiday‑adjusted: Graph Core 20, Trust Fabric 22, Copilot/UX 8, Gov/Ops 9, QA/Release 5).  
> **Capacity Check:** Reduced capacity due to Dec 25; achievable with focus on GA stabilization.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Trust Fabric:* ZK recursion stability, perf guardrails, notarization anchors
- *Gov/Ops:* federation tenant GA (caps, compensation, contention), audit parity, cost v1.3
- *Graph Core:* narrative export, task workflows, disclosure cross‑links
- *Copilot/UX:* governance panel, denial explainers, viewer verify UX
- *QA/Release:* stability suites, chaos, audit replay

**Working Agreements**
- No write executes without **dry‑run + feasibility PASS** + tenant cap check.
- ZK changes require **determinism proof** and **side‑channel checklist**.
- Narrative exports must resolve **all evidence links** and pass disclosure checks.

---

## 5) Ceremonies & Calendar
- **Planning:** Mon Dec 15, 90m.  
- **Stand‑ups:** 9:30–9:40 MT daily.  
- **Grooming:** Wed Dec 17 (45m), Mon Dec 22 (30m).  
- **Holiday:** Thu Dec 25 (US).  
- **Mid‑Sprint Demo & Risk:** Tue Dec 23 (30m).  
- **Review + Demo:** Fri Dec 26 (60m).  
- **Retro:** Fri Dec 26 (30m).

---

## 6) Definition of Ready (DoR)
- Story ≤8 pts; fixtures named; flags defined; tenant schemas; privacy notes; dashboards updated.

## 7) Definition of Done (DoD)
- Tests ≥ 90%; tenant write GA guards proven; recursion stable; narratives ship; A/B logged under governance; v1.3 anchors verify; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Federation GA:** over‑cap block; contention retry; compensation replay; multi‑tenant audit export.  
- **ZK:** repeatability 100×; verify latency p95; cross‑arch check; side‑channel scan.  
- **Case M5:** narrative export diffs; task burndown; broken link detector.  
- **Predictive:** traffic split; lift metrics; denial explainers; opt‑in logs.  
- **Disclosure v1.3:** anchor verify offline; rotation; revocation flow.

---

## 9) Metrics & Telemetry (Sprint)
- **Federation:** write success/rollback, over‑cap blocks, contention retries, audit exports.  
- **Trust:** recursion verify p95, determinism rate, side‑channel alerts.  
- **Case Ops:** narrative export adoption, task burndown slope, broken link incidents.  
- **Predictive:** lift (Δ time‑to‑hypothesis), opt‑in rate, denial frequency.  
- **Reliability/Cost:** error budget burn, write cost delta vs estimate.

---

## 10) Risks & Mitigations
- **Holiday churn** → freeze risky merges Dec 24–26; restrict to bugfixes.  
- **Compensation logic gaps** → table‑driven undo plans; fallback to manual playbook.  
- **Recursion regressions** → stability suite gate; rollback to batching only.  
- **Anchor trust chain issues** → dual anchor (timestamp + PKI); viewer warnings.

---

## 11) Deliverables (Artifacts)
- `docs/` → Federation Tenant GA spec; ZK recursion stability notes; Case M5 narrative export; Predictive A/B SOP; Disclosure v1.3 anchors.  
- Dashboards: Federation (caps/compensation), Trust (verify/alerts), Case Ops (narratives/tasks), Predictive (lift), Reliability/Cost.  
- Runbooks: “Compensating Actions”, “Recursion Stability Ops”, “Narrative Export QA”, “Anchor Registry Ops”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-FED-WRITE-GA`, `EPIC-ZK-RECURSION-STABLE`, `EPIC-CASE-M5`, `EPIC-PREDICTIVE-AB`, `EPIC-DISCLOSURE-1.3`  
**Labels:** `federation-write`, `tenant-ga`, `zk-recursion`, `case-space`, `narrative-export`, `predictive-ab`, `disclosure-v1.3`, `cost-model`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**
```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:
- [ ] Behavior criteria…
- [ ] PCQ/LAC/ZK hooks verified…
- [ ] Tenant caps + compensation validated…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches
```http
POST /federation/write/compensate { planId }
GET  /audit/tenant/{tenantId}/bundle { window }
POST /zk/verify/recursive { proofId }
POST /case/{id}/narrative/export { template }
POST /predict/ab/assign { userId }
POST /disclosure/anchor/verify { bundleId }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S24)
- Federation **multi‑region** write posture (latency budgets).  
- ZK recursion batching GA + hardware acceleration options.  
- Case M6: evidence graph → narrative drafting assistance.  
- Predictive: offline eval harness; drift detectors.  
- Disclosure v1.4: cross‑chain anchoring.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial S23 sprint plan drafted for planning review.

> Owner: PM — Sprint 23  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead


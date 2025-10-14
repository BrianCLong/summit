# IntelGraph — Sprint 18 Plan (v1.0)

**Slug:** `intelgraph-sprint-2025-10-06_v1.0`  
**Dates:** Oct 6–Oct 17, 2025 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2025.10.r1` (post‑sprint, feature flags default OFF)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Deliver **verifiable trust primitives** and **case workflow scaffolding** end‑to‑end: ship **Proof‑Carrying Analytics (PCA) alpha**, advance **License/Authority Compiler (LAC) to beta**, and stand up **Case Spaces M0** with disclosure packaging. Validate via automated proofs, policy simulations, and stage demo across tri‑pane UX.

**Definition of Victory (DoV):**
- A graph query can be executed through a deterministic DAG, emitting a signed **PCQ manifest**; an external verifier replays and validates it.
- A query touching governed fields is **blocked by policy bytecode** produced by LAC; a diff simulator explains the decision.
- Analysts can open a **Case Space**, assign roles, track SLA timers, and export a **Disclosure Bundle** with provenance manifest.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- PCA Alpha: Deterministic DAG runner, per‑node attestation, `*.pcq` manifest writer, verifier CLI.
- LAC Beta: DSL v0.6 (license/warrant/purpose), compiler → WASM policy bytecode, inline diff simulator.
- Case Spaces M0: create/read/update, roles, SLA timers, 4‑eyes toggle, Disclosure Packager v0.
- Observability: OTEL traces for PCA/LAC, Prom metrics, SLO dashboards; chaos drill stub.

**Should**
- Copilot guardrail message when LAC blocks an action; inline “reason‑for‑denial”.
- Tri‑pane UX: provenance tooltips + “Explain this view” panel stub for PCA outputs.

**Won’t (this sprint)**
- ZK‑TX partner proofs, federation planner GA, predictive suite integration.

---

## 3) Sprint Backlog (Epics → Stories → Acceptance)

### Epic A — Proof‑Carrying Analytics (PCA) **Alpha**
**A1. Deterministic DAG Runner (backend)**
- *Stories*
  - Implement run graph with content‑addressed nodes; stable ordering; recorded seeds. (8 pts)
  - Node attestation: input hashes, model cards, hyperparameters, checksum tree. (5 pts)
- *Acceptance*
  - Any re‑run with same inputs produces byte‑identical manifests. Tamper → alarm.

**A2. PCQ Manifest Writer**
- *Stories*
  - Emit `*.pcq` JSON (+ Merkle proofs) per materialized result; sign with tenant key. (5 pts)
  - Attach lineage to UI view: “Provenance” pill opens manifest summary. (3 pts)
- *Acceptance*
  - Stage verifier validates at least 5 golden flows; failure blocks export.

**A3. Verifier CLI + Stage Verifier Service**
- *Stories*
  - CLI tool `pcq verify` (inputs: manifest path, fixtures seed). (3 pts)
  - Stage service to replay DAG on synthetic fixtures; response → PASS/FAIL with diff. (5 pts)
- *Acceptance*
  - External verifier reproduces results within tolerance; non‑determinism flagged.

### Epic B — License/Authority Compiler (LAC) **Beta**
**B1. Policy DSL v0.6**
- *Stories*
  - Extend grammar: licenses, warrants, retention clocks, purpose tags. (5 pts)
  - Unit library: common clauses (OFAC, GDPR purpose limitation, tenant retention). (3 pts)
- *Acceptance*
  - 100% policy hit‑rate on test corpus; unknown clause → explicit error with guidance.

**B2. Compiler → WASM Policy Bytecode**
- *Stories*
  - Compiler emits deterministic bytecode; embed policy IDs; expose `evaluate(queryCtx)` ABI. (8 pts)
  - Runtime: query‑time gate; unsafe ops **unexecutable**; reason strings + appeal link. (5 pts)
- *Acceptance*
  - Unsafe query path blocked in stage; reason cites authority; appeal path logged.

**B3. Inline Diff Simulator**
- *Stories*
  - Run historical queries under candidate policy; produce allow/deny diff + impact report. (5 pts)
- *Acceptance*
  - Simulator report downloadable (CSV + HTML), referenced in audit log.

### Epic C — Case Spaces **M0** (+ Disclosure Packager v0)
**C1. Case CRUD + Roles & SLA**
- *Stories*
  - Case create/read/update; assign roles; SLA timers + breach alerts; legal hold flag. (8 pts)
- *Acceptance*
  - All edits/audits visible; SLA breach triggers notification; legal hold blocks deletes.

**C2. 4‑Eyes Control**
- *Stories*
  - Dual‑control switch for risky exports/actions; approver workflow. (5 pts)
- *Acceptance*
  - Exports > sensitivity X require second approver.

**C3. Disclosure Packager v0**
- *Stories*
  - Bundle evidence + PCQ manifest + license terms; hash tree; audience filters (press/court/partner). (8 pts)
- *Acceptance*
  - External validator flags any modification; revocation propagates on next open.

### Epic D — Observability & Ops
**D1. OTEL/Prom & SLO Dash** (5 pts) — p95 query latency panel, ingestion E2E panel, cost guard stub.  
**D2. Chaos Drill Stub** (3 pts) — pod kill in dev; runbook entry seeded.

### Epic E — Copilot/UX Glue
**E1. Guardrail Reasoner Surface** (3 pts) — “Blocked by policy” pane with policy ID + explainers.  
**E2. Tri‑Pane Provenance Tooltips** (3 pts) — show confidence/lineage badges on nodes/edges.

> **Sprint Point Budget:** 78 pts (Graph Core 28, Trust Fabric 25, Copilot/UX 12, Gov/Ops 8, QA 5).  
> **Capacity Check:** Based on rolling velocity = 80±10% pts; green.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Trust Fabric:* PCA, PCQ, Verifier, policy runtimes.
- *Gov/Ops:* LAC DSL, compiler, diff simulator, SLO/chaos, audit wiring.
- *Graph Core:* Case Spaces, Disclosure Packager, audit trails.
- *Copilot/UX:* Provenance UI, guardrail panes, tri‑pane badges.
- *QA/Release:* Golden fixtures, E2E flows, gating checks.

**Working Agreements**
- Feature flags default OFF; merge behind flags with full tests.
- No PR merges without PCQ fixture updates and policy impact diffs.
- Pair review on LAC changes; dual‑control override required.

---

## 5) Ceremonies & Calendar
- **Sprint Planning:** Mon Oct 6, 90m. Story slicing to ≤8 pts.
- **Daily Stand‑ups:** 9:30–9:40 MT.
- **Backlog Grooming:** Wed Oct 8, 45m; Fri Oct 10, 30m.
- **Mid‑Sprint Demo & Risk Review:** Tue Oct 14, 30m.
- **Chaos Drill (dev):** Thu Oct 16, 20m window.
- **Sprint Review + Demo:** Fri Oct 17, 60m (live verifier + case export).
- **Retro:** Fri Oct 17, 30m (start/stop/continue + risk burndown).

---

## 6) Definition of Ready (DoR)
- Clear user story, measurable acceptance, test data identified, feature flag named, UI copy stubbed.
- Security & privacy notes present; license/authority references included.

## 7) Definition of Done (DoD)
- Unit + contract tests ≥ 90% for changed modules; E2E on golden flows pass.
- PCQ manifest generated & verified on stage; LAC decisions recorded with reasons.
- Docs: ADR updated; runbook entry; dashboards and alerts wired; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Golden flows (stage):** ingest → resolve → compute metric → PCA manifest → verifier PASS.
- **Policy corpus:** 30+ rules spanning licenses/warrants/purpose/retention; 100% hit‑rate required.
- **E2E screenshots:** tri‑pane with provenance badges; guardrail pane on blocked action.
- **Load test:** k6 smoke on DAG runner (1k jobs, p95 < 1.5s @ N=3 hops, 50k nodes).
- **Chaos:** single pod kill; verify auto‑recovery; alert fired.

---

## 9) Metrics & Telemetry (Sprint)
- **Trust:** % results with valid PCQ; external verifications passed; zero unexplained deltas.
- **Safety:** # blocked unsafe ops; ombuds cycle time (if any appeals).
- **Speed:** time‑to‑hypothesis on golden case; replay determinism rate.
- **Reliability:** p95 query latency; ingest E2E; error budget burn.

---

## 10) Risks & Mitigations
- **Non‑determinism in pipelines** → Fix with content‑addressed IO + seed pinning; diff reports.
- **Policy over‑blocking** → Use diff simulator mid‑sprint; maintain allowlist for demo fixtures.
- **Scope creep on Case Spaces** → Freeze to M0; defer watchlists/comments to next sprint.
- **Crypto/key mgmt friction** → Stage keys via sealed‑secrets; rotate post‑demo.

---

## 11) Deliverables (Artifacts)
- `docs/` → Sprint plan (this file), PCA spec notes, LAC DSL v0.6 draft, Case Spaces M0 API.
- `cli/pcq` → Verifier CLI binary + README.
- Dashboards: SLO board (latency, ingest), trust board (PCQ pass‑rate), safety board (policy blocks).
- Runbooks: “Verifier Replay”, “Policy Diff Simulator”, “Disclosure Export”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-PCA-ALPHA`, `EPIC-LAC-BETA`, `EPIC-CASE-M0`, `EPIC-OBS-OPS`, `EPIC-COPILOT-GLUE`  
**Common Labels:** `proof-carrying`, `policy-compiler`, `governance`, `case-space`, `tri-pane`, `pcq`, `lac`, `slo`, `chaos`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**
```md
As an <analyst/admin>, I want <capability>, so that <verifiable outcome>.
Acceptance:
- [ ] Behavior criteria…
- [ ] PCQ/LAC hooks verified…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches (current sprint)
```http
POST /pcq/verify { manifestUrl }
POST /policy/compile { dsl }
POST /policy/evaluate { queryCtx, policyId }
POST /policy/simulate { policyDraft, historicalQueryIds[] }
POST /case { name, roles[], sla }
POST /case/{id}/export { audience }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S19)
- ZK‑TX prototype integration with LAC evidence.
- Federation Planner push‑down (read‑only pilot).
- Case Spaces M1: comments/@mentions, watchlists, legal hold UX polish.
- Adversarial ML red‑team harness for Copilot prompts.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial sprint plan drafted and approved by PM/Eng.

> Owner: PM — Sprint 18  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead


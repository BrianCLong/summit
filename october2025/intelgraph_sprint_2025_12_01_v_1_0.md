# IntelGraph — Sprint 22 Plan (v1.0)

**Slug:** `intelgraph-sprint-2025-12-01_v1.0`  
**Dates:** Dec 1–Dec 12, 2025 (10 working days)  
**Cadence:** 2 weeks  
**Release Train:** `2025.12.r2` (feature flags default OFF; progressive rollout)  
**Teams:** Graph Core, Trust Fabric, Copilot/UX, Gov/Ops, QA/Release  
**Environments:** dev → stage → prod; ephemeral preview envs per PR

---

## 1) Sprint Goal
Advance **federation** from read‑only to **guard‑railed writes**, scale **ZK proofs** with batching/recursion experiments, and unlock **Case M4** redaction workflows. Ship **Disclosure v1.2** client‑side verification kits and a guarded **Predictive Suite Pilot** for policy‑safe hypothesis ranking.

**Definition of Victory (DoV):**
- Federation **write sandbox** supports idempotent mutations on demo schemas with **transactional rollback** and **policy feasibility checks**.
- ZK batching/recursion prototype demonstrates ≥3× throughput vs single proofs on governed columns, with replayable PCQ linkage.
- Case M4 provides **timeline storyboards**, **redaction**, and **export with redact rules applied**.
- Disclosure v1.2 viewer kit validates bundles **entirely client‑side**; integrity warnings trigger on tamper/offline.
- Predictive pilot surfaces **policy‑safe suggestions** with rationale and opt‑in logging.

---

## 2) Scope (Must/Should/Won’t)
**Must**
- Federation Write Sandbox (mutations), TX guard, preflight diff, audit trail, cost/egress caps.
- ZK Proof Batching/Recursion experiment (Groth16/PLONK compare), prover pool, verifier compatibility.
- Case Spaces M4: storyboards, redaction rules (field/node/attachment), export enforcement.
- Disclosure Packager v1.2: client verifier kits (Web/WASM), offline cache policy, UX prompts.
- Predictive Suite Pilot: hypothesis ranking on whitelisted features; denial explainer; feedback capture.

**Should**
- Cost Model v1.2: include egress + write amplification; Alerts on over‑budget.
- Policy Pack Marketplace: curated list + security review checklist.

**Won’t (this sprint)**
- Federation multi‑tenant write GA; ZK recursion GA; predictive GA; pack marketplace publishing.

---

## 3) Sprint Backlog (Epics → Stories)

### Epic A — Federation **Write Sandbox (Pilot)**
**A1. Mutation Plan & Preflight Diff**  
- Compute write plan; present preflight diff with policy feasibility; dry‑run endpoint. (8 pts)  
- *Acceptance:* Dry‑run shows changed rows/columns; blocked ops show reason + policy IDs.

**A2. Transaction Guard + Rollback**  
- Wrap execution in TX; partial failure → rollback; idempotency keys. (8 pts)  
- *Acceptance:* Chaos test forces mid‑TX failure; system leaves no side effects.

**A3. Audit + Cost/Egress Caps**  
- Record plan, cost estimate, actuals; cap enforcement; operator override with 4‑eyes. (5 pts)  
- *Acceptance:* Over‑cap blocked with rationale; override logged and notified.

### Epic B — ZK Proof **Batching & Recursion** (R&D)
**B1. Batch Prover Pool**  
- Batch multiple governed‑column accesses; parallel proving workers; queue metrics. (5 pts)  
- *Acceptance:* ≥3× throughput vs baseline on stage dataset.

**B2. Recursion Prototype**  
- Aggregate proofs via recursion; output verifier‑compatible proof. (5 pts)  
- *Acceptance:* Verifier validates aggregate proof; size/latency recorded.

**B3. PCQ Integration**  
- Link batch/recursive proof IDs into manifest; replay supported by stage verifier. (3 pts)  
- *Acceptance:* Golden flow with aggregate proof passes.

### Epic C — Case Spaces **M4**
**C1. Storyboards (Timeline++)**  
- Compose investigations as storyboard tracks; pin evidence; annotate milestones. (5 pts)  
- *Acceptance:* Export storyboard PDF; p95 render < 200ms.

**C2. Redaction Rules & Engine**  
- Rules for fields/nodes/attachments; preview; irreversible export. (8 pts)  
- *Acceptance:* Export honors rules; integrity check confirms redaction.

**C3. Redaction‑Aware Disclosure**  
- Packager enforces redaction; adds rule hash to bundle manifest. (3 pts)  
- *Acceptance:* Client kit refuses open if redaction hash mismatch.

### Epic D — Disclosure Packager **v1.2** (Client Kits)
**D1. Web/WASM Verifier Kit** (5 pts) — verify signatures, PCQ integrity, redaction hash; offline cache policy.  
**D2. UX Prompts & Telemetry** (3 pts) — tamper/offline prompts; event logging to trust board.

### Epic E — Predictive Suite **Pilot (Guarded)**
**E1. Feature Whitelist + Policy Guard** (3 pts) — safe feature set; denial explainer.  
**E2. Hypothesis Ranking + Feedback** (3 pts) — surface candidates with rationale; capture user rating.  
**E3. Audit & Tuning Loop** (2 pts) — log feature use; tuning notes under governance.

> **Sprint Point Budget:** 76 pts (Graph Core 25, Trust Fabric 26, Copilot/UX 10, Gov/Ops 10, QA/Release 5).  
> **Capacity Check:** Rolling velocity ~76±8 pts; green.

---

## 4) Swimlanes & Working Agreements
**Swimlanes**
- *Trust Fabric:* ZK batching/recursion, PCQ integration, client verifier.
- *Gov/Ops:* federation write sandbox (TX/caps/audit), cost model v1.2.
- *Graph Core:* Case M4 storyboards + redaction, disclosure wiring.
- *Copilot/UX:* predictive pilot surfaces, tamper prompts, denial explainers.
- *QA/Release:* chaos for write‑rollback, aggregate proof replay, client kit validation.

**Working Agreements**
- All write operations **require** dry‑run + preflight diff and policy feasibility PASS.
- Any export including redactions must attach **redaction rule hash** and PASS client‑kit verify in stage.
- Predictive outputs must include **explainers** and be **opt‑in** with feedback.

---

## 5) Ceremonies & Calendar
- **Planning:** Mon Dec 1, 90m.  
- **Stand‑ups:** 9:30–9:40 MT daily.  
- **Grooming:** Wed Dec 3 (45m), Fri Dec 5 (30m).  
- **Mid‑Sprint Demo & Risk:** Tue Dec 9 (30m).  
- **Chaos (dev):** Thu Dec 11 (20m).  
- **Review + Demo:** Fri Dec 12 (60m).  
- **Retro:** Fri Dec 12 (30m).

---

## 6) Definition of Ready (DoR)
- Story ≤8 pts; fixtures named; flags defined; privacy notes; access to demo schemas; dashboards updated.

## 7) Definition of Done (DoD)
- Tests ≥ 90%; write sandbox rollback validated; batch/recursive proofs verified; storyboards + redactions enforced; client kit validates; docs/runbooks updated; release notes drafted.

---

## 8) Test Plan & Fixtures
- **Federation:** preflight diff golden cases; over‑cap negative; chaos mid‑TX rollback.
- **ZK:** throughput baseline vs batch/recursion; verifier compat; PCQ linkage.
- **Case M4:** storyboard export; redaction integrity; disclosure redaction hash check.
- **Predictive:** whitelist enforcement; feedback loop capture; denial explainer copy.
- **Chaos:** prover pool saturation; client‑kit offline; write sandbox egress spike.

---

## 9) Metrics & Telemetry (Sprint)
- **Federation:** % writes via sandbox, rollback rate (target < 1%), over‑cap blocks.
- **Trust:** proof throughput vs baseline, aggregate proof size/latency, client‑kit verify rate.
- **Case Ops:** storyboard adoption, redaction policy usage, export success rate.
- **Reliability/Cost:** error budget burn, write cost delta vs estimate.

---

## 10) Risks & Mitigations
- **Write path side effects** → strict dry‑run; idempotency keys; TX rollback tested.
- **ZK complexity** → narrow scope; pre‑compiled keys; bail‑out to batching only.
- **Redaction errors** → preview + integrity checks; require dual approval on high‑risk exports.
- **Client‑side verification variance** → browser/WASM compatibility matrix; fallback CLI.

---

## 11) Deliverables (Artifacts)
- `docs/` → Federation Write Sandbox spec; ZK batching/recursion notes; Case M4 UX; Disclosure v1.2 kit README; Predictive Pilot SOP; Cost v1.2.  
- Dashboards: Federation (writes/rollbacks/caps), Trust (ZK throughput/verify), Case Ops (redactions), Reliability/Cost.  
- Runbooks: “Write Sandbox Ops”, “Batch/Recursive Proof Ops”, “Client Kit Support”, “Redaction Review”.

---

## 12) Jira Scaffolds & Labels
**Epics:** `EPIC-FED-WRITE-PILOT`, `EPIC-ZK-BATCH-RECURSE`, `EPIC-CASE-M4`, `EPIC-DISCLOSURE-1.2`, `EPIC-PREDICTIVE-PILOT`  
**Labels:** `federation-write`, `zk-batch`, `zk-recursion`, `case-space`, `redaction`, `disclosure-v1.2`, `predictive-safe`, `cost-model`  
**Components:** `graph-core`, `trust-fabric`, `gov-ops`, `ux-copilot`, `qa-release`

**Issue Template (user story)**
```md
As a <role>, I want <capability>, so that <verifiable outcome>.
Acceptance:
- [ ] Behavior criteria…
- [ ] PCQ/LAC/ZK hooks verified…
- [ ] Write preflight + rollback validated…
- [ ] Telemetry events emitted…
```

---

## 13) API Sketches
```http
POST /federation/write/dryrun { plan, ceiling }
POST /federation/write/execute { plan, idempotencyKey }
POST /zk/prove/batch { accesses[] }
POST /zk/verify/aggregate { proof }
POST /case/{id}/redact { rules[] }
GET  /disclosure/verify/kit
POST /predict/hypotheses { seed, features[] }
```

---

## 14) Out‑of‑Scope + Next Sprint Seeds (S23)
- Federation write **tenant GA**; policy‑aware compensating actions.  
- ZK recursion stabilization + metrics; side‑channel audits.  
- Case M5: evidence linking → narrative export; task workflows.  
- Predictive: A/B of rankers; governance review panel.  
- Disclosure v1.3: notarization anchors.

---

## 15) Versioning & Change Log
- **v1.0 (2025‑09‑29)** — Initial S22 sprint plan drafted for planning review.

> Owner: PM — Sprint 22  
> Approvers: Eng Lead (Trust Fabric), Eng Lead (Graph Core), UX Lead, Gov/Ops Lead


# Sprint Prompt — Operation **PROVENANCE FIRST** (Wishlist Sprint 01)

**Window:** 2 weeks — start on Monday, end on Friday (demo at 1500 local).  
**Theme:** Ship a vertical slice that proves IntelGraph’s ethics‑first DNA: provenance, policy guardrails, and explainable NL → Cypher on a real ingest.  
**Why now:** This sprint hardens trust. We will not scale guesses; we will scale proof, audit, and reversible automation.

---

## 1) Mission (Non‑Negotiable)

Produce a working, demoable path: **Ingest → Provenance/Claims → Policy‑guarded NL Query → Evidence‑first Report** — with verifiable export.

---

## 2) Scope (In)

1. **Ingest Wizard v0.9 (MVP)**
   - CSV/JSON upload; schema mapping with AI suggestions; PII classifier; license/TOS selection; lineage capture.
   - Streaming ETL path with enrichers stubbed: GeoIP, language, hashing, EXIF scrub, OCR hook.
2. **Provenance & Claim Ledger v0.9**
   - Evidence registration (source → transform chain), checksums, claim extraction stub (`Claim` nodes).
   - **Export manifest** (hash tree + transform chain) verifiable by external script.
3. **NL → Cypher Query Copilot v0.6**
   - Prompt → generated Cypher **preview** with cost/row estimates; sandbox execution on read‑only dataset; undo/redo; diff vs. hand‑written query.
4. **Policy Reasoner & Audit v0.7**
   - ABAC/OPA policies; **reason‑for‑access prompts**; block pages show human‑readable justification + appeal path; immutable audit log.
5. **Report/Disclosure Pack v0.4**
   - Evidence‑first brief: timeline+graph snapshot figures; inline citation stubs; **Disclosure bundle** includes export manifest.
6. **UI Shell: Tri‑Pane**
   - Graph + Timeline + Map shells with synchronized time brushing (basic), dark/light, command palette stub.

---

## 3) Scope (Out for this sprint)

- Entity Resolution **clustering** (keep to deterministic dedupe + explain panes).
- Federated search, multi‑tenant cross‑case linking.
- Live SIEM/TAXII bridges (use stubs/fixtures only).
- Advanced simulations, anomaly scoring, Counterfactual/XAI beyond basics.

---

## 4) Deliverables

- **Running demo** on a fresh environment with seeded sample data (synthetic + public‑license).
- **CLI verifier** to validate export manifests offline.
- **Golden fixtures** for ingest mappings and NL→Cypher tests.
- **Policy pack** (OPA bundle) with at least 5 guardrails and test cases.
- **One‑click disclosure export** (ZIP): report HTML/PDF, figures, manifest.json, license.txt.

---

## 5) Acceptance Criteria (Definition of Done)

### Ingest Wizard

- User maps CSV/JSON to canonical entities in **≤10 minutes** with AI suggestions; PII flags visible; license/TOS recorded; **lineage captured** for each field.
- Streaming run produces nodes/edges with source → assertion → transformation chain.

### Provenance & Claim Ledger

- Every node/edge persisted with content checksum + source pointer; claims recorded as first‑class nodes.
- **Export produces a verifiable manifest** (hash tree + transforms). Verifier returns PASS on golden bundle.

### NL → Cypher Copilot

- For the provided prompt suite (≥30), **≥95% syntactic validity** of generated Cypher; sandbox execution returns results or safe error with hint.
- Preview shows **cost/row estimate**; user can **undo/redo** and **diff** against a hand query.

### Policy Reasoner & Audit

- Access to a protected field triggers **reason‑for‑access** modal; audit log stores who/what/why/when.
- **Blocked actions** render a page with clear justification and an **appeal path** link.

### Report/Disclosure

- Generated brief contains **competing‑hypotheses slots** (even if empty) and confidence language.
- **Disclosure bundle** includes all exhibits with checksums, license summary, and the manifest; verifier PASS required.

### UI Tri‑Pane

- Graph/Timeline/Map render the same selection; time brushing narrows results consistently across panes.

---

## 6) Work Breakdown (By Workstream)

### Backend / Services

- `prov-ledger` service:
  - POST `/evidence/register` (payload: source, transform, checksum, licenseRef)
  - POST `/claim` (payload: claim text, evidenceRefs, confidence)
  - GET `/export/manifest/:caseId` → manifest.json (hash tree over artifacts + transform chain)
- `policy-gateway` (GraphQL/OPA):
  - ABAC policy labels on entities/edges.
  - Reason‑for‑access hook and audit emitter.
- `query-sandbox`:
  - Compile generated Cypher with cost estimates; read‑only execution; capture query plan.

### Frontend / Apps

- Ingest Wizard: file upload → mapping UI → PII flags → license/TOS picker → dry‑run → commit.
- NL→Cypher:
  - Prompt box → Cypher preview pane → cost/row chips → execute (sandbox) → results table.
  - **Diff view** vs. hand‑written query.
- Provenance HUD: per‑node/edge provenance tooltip; manifest download.
- Policy UX: reason‑for‑access modal; block page with justification + appeal link.
- Report Studio: timeline, map, graph snapshots; disclosure ZIP builder.

### Graph / DB

- Canonical schema (Person, Org, Asset, Event, Document, Claim, Case, Authority, License).
- Temporal fields: `validFrom/validTo`, `observedAt/recordedAt`.
- Write‑paths enforce provenance and policy tags; read‑paths respect ABAC.

### AI / NLP

- Mapping suggester for Ingest Wizard (lightweight rules + model stub).
- Prompt → Cypher generator (templated grammar + tests).
- Confidence/guarded language helper for Report Studio.

### Security & Governance

- OPA policies: sensitivity, legal basis, purpose limitation, retention class.
- Audit log schema + storage; immutable append (WORM‑like) and search.
- License registry + enforcement at export.

### DevEx / SRE

- Golden fixtures; k6 smoke for read queries; basic chaos (kill one pod) without data loss.
- SLO dashboards: p95 query latency, ingest E2E timings, export duration.
- CI gates: schema contracts, Cypher unit tests, manifest verifier.

---

## 7) Test Plan

- **Unit:** connector manifests, schema mapping suggestions, Cypher generator grammar, policy decisions (OPA tests).
- **E2E:** ingest → provenance → NL query → disclosure; screenshot diffs for UI; verifier PASS on export bundle.
- **Load:** 10k docs in ≤5 minutes; typical graph query p95 < 1.5s on 50k‑node neighborhood (fixture).
- **Chaos:** single‑pod kill on `prov-ledger` during export; resume produces identical manifest.

---

## 8) Demo Script (15 minutes)

1. Upload CSV; map fields with AI suggestions; note PII/License; commit.
2. Show graph view; open provenance tooltip on a node; drill to claim chain.
3. Ask: “Show entities co‑present within 100m during a 30m window near X.” → preview Cypher, show cost, execute sandbox.
4. Attempt to access a sensitive field → reason‑for‑access modal → approve → audit entry visible.
5. Generate report; export disclosure bundle; run verifier; **PASS**.

---

## 9) Metrics (Sprint Exit)

- NL→Cypher syntactic validity ≥95% on suite;
- Ingest mapping TTI ≤10 minutes;
- Export verifier PASS rate 100% on demo, ≥95% on ad‑hoc runs;
- Policy block pages return sub‑150ms;
- p95 query < 1.5s (fixture).

---

## 10) Risks & Mitigations

- **Scope creep:** lock to preview/sandbox for NL queries; no write mutations.
- **Policy sprawl:** start with 5 canonical rules; add only with test.
- **Data poisoning:** mark fixtures; tag any honeypot sources; telemetry sanity checks.
- **Licensing ambiguity:** require license selection at ingest; block export without license metadata.

---

## 11) Dependencies

- Basic connector client + CSV/JSON loader.
- Graph DB (Neo4j/JanusGraph stub acceptable this sprint) with schema migrations.
- OPA sidecar or library with hot‑reload bundle.

---

## 12) Stretch (Only if green by Day 7)

- Deterministic ER merge pane with explainability scorecard.
- Map corridor overlay + stay‑point detection on sample geo data.
- Signed sync logs for offline disclosure export (edge kit stub).

---

## 13) Operating Rules

- “Policy by default”: if in doubt, block with a readable reason; log everything.
- “Provenance Before Prediction”: no claim ships without a source/transform chain.
- “Reversible automation”: every automated decision must be explainable and undoable.

---

## 14) Sample User Stories

- _As an analyst,_ I can map a CSV to entities in ≤10 minutes, see PII flags, and commit with license so I don’t derail legal.
- _As a reviewer,_ I can open a node and read exactly which evidence created it.
- _As a junior,_ I can ask a natural question and see the generated Cypher and cost before I run it.
- _As an ombudsman,_ I can see who accessed what and why, and I can export a manifest I can verify offline.

---

## 15) Exit Criteria (Go/No‑Go)

- Live demo completes without manual DB edits.
- Export verifier passes in a clean environment.
- All acceptance checks above met.
- Post‑demo hotwash produces one‑page “what broke / what we fix next.”

> **Orders:** Build the slice. Prove the ethics. Leave no provenance behind.

# Sprint 07 Plan — IntelGraph
**Dates:** Mon Aug 25 → Fri Sep 5, 2025 (10 working days, America/Denver)
**Branch:** `release/sprint-07`
**Theme:** GA Core vertical slice — *Provenance-first analytics with NL→Cypher preview*
**Sprint Goal:** Ship an end‑to‑end, auditable investigation flow: ingest → resolve → analyze → cite → export. Specifically, deliver **Provenance & Claim Ledger (beta)** wired into **NL Graph Query (preview)** and the **tri‑pane UI** with policy‑aware access checks and SLO/Cost guardrails.

---
## Outcomes (Demo‑able)
1) **Rapid Attribution (CTI) runbook** demo on sample STIX feed: analyst types a natural query → generated Cypher preview → sandbox runs → tri‑pane updates (graph/timeline/map) → evidence is cited → export produces a verifiable manifest.
2) **Policy reasoner** blocks an unauthorized export with a human‑readable reason and an appeal path.
3) **SLO dashboard** shows p95 query latency and ingest E2E timing from traces.

---
## Scope
### Must‑Have (Committed)
- **Prov‑Ledger (beta)** service with:
  - Evidence/Claim schemas; hash chain (SHA‑256) and transform manifests.
  - APIs: `POST /evidence`, `POST /claims`, `GET /bundles/:id/export` (manifest JSON + files), `GET /claims/:id` (lineage).
  - Graph bindings: `Claim` and `Evidence` nodes/edges persisted to Neo4j with provenance attributes.
- **AI Copilot — NL→Cypher (preview):** prompt → generated Cypher preview with cost/row estimate; **sandbox execution**; rollback.
- **Tri‑pane UI wiring:** Cytoscape.js graph + timeline + map synchronized; provenance tooltips and **“Explain this view”** overlay.
- **ABAC/OPA** policy enforcement in GraphQL gateway; **policy labels** on nodes/edges; reason‑for‑access prompts.
- **Connectors (v1):** CSV ingest wizard (schema mapping + PII flags); **STIX/TAXII** pull stub with conformance tests.
- **Observability & Guards:** OTEL traces, Prometheus metrics; **SLO dashboard skeleton**; **query cost guard** (budget + slow query killer baseline).

### Should‑Have (Stretch)
- **Disclosure Packager v1** in UI (bundle download with manifest).
- **Risk/Anomaly detector stub** with XAI panel (why this scored high) on demo data.
- **Offline/edge kit sync skeleton** for evidence bundles (local cache + signed resync log).

### Out of Scope (De‑risk)
- Federated multi‑graph search; deception lab; advanced simulations; mobile app; marketplace.

---
## User Stories (selected)
- **IG‑721** As an analyst, I can **ingest a CSV** and map fields to canonical entities with PII flags so that data enters the graph safely.
- **IG‑722** As an analyst, I can **ask a natural‑language question** and see the **generated Cypher** with an estimated cost before I run it.
- **IG‑723** As an analyst, I can **run the query in a sandbox** and see synchronized **graph/timeline/map** updates.
- **IG‑724** As an analyst, I can **hover any node/edge** to view **provenance**, license, and confidence.
- **IG‑725** As a reviewer, I can **export a disclosure bundle** with a **hash manifest** to verify chain‑of‑custody.
- **IG‑726** As a policy owner, I can see **blocked actions** with a **clear reason** and a documented appeal path.
- **IG‑727** As an SRE, I can see **p95 query latency** and **ingest E2E timing** in a dashboard.

---
## Work Breakdown & Owners
> Use pairing; rotate mid‑sprint. FE = Frontend, BE = Backend, AI = Copilot/ML, Graph = Neo4j/Cypher, DevX = DevOps/Platform, QA = Quality.

### 1) Provenance & Claim Ledger (BE, Graph)
- Define schemas (`Claim`, `Evidence`, `License`, `Authority`); migration scripts.
- Implement service with REST + Kafka outbox; idempotency keys; E2E tests.
- Neo4j bindings (constraints, indexes, relationship types; time‑versioned attrs `validFrom/To`).
- Export manifest generator (Merkle tree over artifacts; transformation chain; signatures stubs).
- **Deliverables:** service Helm chart, OpenAPI, golden tests; sample verifier script.

### 2) NL→Cypher (AI, Graph, BE)
- Prompt templates + safety guardrails; syntactic validator; cost/row estimator.
- Sandbox executor with **read‑only** role & timeouts; undo/redo transaction log.
- Logging for prompt/response with model card fields; PII scrubbing.
- **Deliverables:** `/copilot/preview` and `/copilot/execute` endpoints; k6 latency test.

### 3) Tri‑Pane UI (FE)
- Cytoscape.js graph, vis timeline, map layer (Mapbox) with synchronized brushing.
- jQuery interactions for drag/select, context menus, and inspector panel toggles.
- Provenance tooltips & XAI overlay; "Explain this view" panel scaffolding.
- **Deliverables:** React pages, Material‑UI styling, Redux Toolkit slices, Playwright E2E.

### 4) ABAC/OPA + Policy Labels (BE)
- Extend GraphQL resolvers to check OPA policies; inject `purpose`, `legalBasis` into context.
- Implement reason‑for‑access prompts; audit log entries; step‑up auth hooks.
- **Deliverables:** policy bundles, unit tests, audit visualizer page stub.

### 5) Connectors & Ingest Wizard (BE, FE)
- CSV wizard: mapping UI, field validators, PII classifier, license selection.
- STIX/TAXII stub: pagination, rate‑limit policies, contract tests; sample dataset + fixtures.
- **Deliverables:** connector manifests; ingest pipeline traces; fixture datasets.

### 6) Observability & Cost Guards (DevX)
- OTEL traces across gateway→copilot→graph; Prometheus metrics; Grafana dashboard starter.
- Query budgeter & slow query killer (thresholds + alerts); archived tier stub.
- **Deliverables:** dashboards, alerts, k6 scripts, chaos injection for query timeouts.

### 7) QA & Runbook Demo (QA, All)
- Author **Rapid Attribution (CTI)** demo dataset + runbook script; acceptance tests.
- Playwright flow: ingest → NL query preview → sandbox → tri‑pane → export; screenshot baselines.
- **Deliverables:** CI job `e2e-runbook-r1`, artifacts, demo video.

---
## Acceptance Criteria (per outcome)
- **Prov‑Ledger:** Creating a bundle yields a manifest with content hashes and a reproducible transform chain; external verifier returns **PASS**.
- **NL→Cypher:** ≥95% syntactic validity on test prompts; preview shows cost estimate; sandbox denies writes.
- **Tri‑pane:** Interactions stay synchronized within 100ms; provenance tooltip shows source, license, confidence.
- **ABAC/OPA:** Unauthorized export **blocked** with human‑readable reason and appeal path logged.
- **Connectors:** CSV mapping completed ≤10 minutes on golden sample; STIX/TAXII stub passes contract tests.
- **SLO/Guards:** p95 query latency displayed; slow queries auto‑killed after threshold with audit entries.

---
## Milestones & Timeline
- **Day 1–2:** Schema/contracts; infra scaffolding; dashboard skeleton.
- **Day 3–5:** Prov‑Ledger core + NL→Cypher preview + CSV wizard MVP.
- **Day 6–7:** Tri‑pane wiring + OPA hooks + STIX/TAXII stub.
- **Day 8:** E2E hardening; k6 + chaos drills; cost guard tuning.
- **Day 9:** Playwright E2E; demo runbook polish; docs.
- **Day 10:** Stakeholder demo; retro; release tag.

---
## Risks & Mitigations
- **Cypher safety/regressions:** enforce read‑only sandbox role; static lint + timeouts.
- **Manifest correctness:** golden tests + external verifier; Merkle inclusion proofs.
- **Latency spikes:** budget caps + slow‑query killer; pre‑warm graph caches.
- **PII leakage in prompts:** scrubbers + prompt privacy; redaction presets in ingest.

---
## Definition of Ready (DoR)
- Story has data samples/fixtures; policy labels defined; acceptance tests sketched; rollback plan noted.

## Definition of Done (DoD)
- Unit/contract tests ≥90% coverage for new modules; CI green; docs updated; security checklist completed; demo scenario recorded; feature flags documented.

---
## Tooling & CI/CD
- **Branches:** `feature/prov-ledger`, `feature/copilot-nl2cypher`, `feature/tri-pane-ui`, `feature/abac-opa`, `feature/connector-stix`, `feature/csv-wizard`, `feature/observability-guards`.
- **PR checks:** ESLint/Prettier; Jest + Supertest; Playwright; k6; OWASP/ZAP passive; Helm lint; Terraform validate.
- **Envs:** ephemeral preview per PR; canary deploy on merge to `develop`.

---
## Documentation & Enablement
- ADRs for Prov‑Ledger, OPA integration, Copilot sandbox; runbook guide for **R1 Rapid Attribution**; operator handbook for SLO dashboard.

---
## Stretch Epics (parking lot)
- XAI explainer overlays for anomaly/risk; disclosure packager UI polish; offline kit v1 sync; ER explainability pane.


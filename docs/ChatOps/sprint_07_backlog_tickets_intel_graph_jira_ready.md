# Sprint 07 Backlog & Tickets — IntelGraph (Jira‑ready)
**Dates:** Mon Aug 25 → Fri Sep 5, 2025  
**Goal:** Ship GA core vertical slice with Prov‑Ledger (beta), NL→Cypher (preview), tri‑pane wiring, ABAC/OPA, CSV/STIX ingest stubs, and SLO/Cost guardrails.

---
## Team Capacity & Velocity
- **Team (assumed):** FE×2, BE×2, AI×1, Graph×1, DevX×1, QA×1.
- **Nominal capacity:** 8 ppl × 10 days = **80 PD** (person‑days).  
- **Focus factor:** 0.8 (meetings, support) → **64 PD** effective.  
- **Velocity baseline:** 80 SP (story points) last two sprints → **planned 76–84 SP**.

---
## Epic Map → Stories (Sprint scope)
- **E‑01 Provenance & Claim Ledger (Prov‑Ledger)** → IG‑724, IG‑725
- **E‑02 NL→Cypher Copilot** → IG‑722
- **E‑03 Sandbox & Tri‑Pane UI** → IG‑723
- **E‑04 ABAC/OPA & Policy Labels** → IG‑726
- **E‑05 Ingest (CSV + STIX/TAXII)** → IG‑721
- **E‑06 Observability & Cost Guards** → IG‑727

> ✅ Definition of Ready for each ticket: sample data attached, API contracts sketched, acceptance tests listed, rollback noted, flags named.

---
## Tickets & Subtasks (Jira‑ready)
> **Notation:** `IG‑###‑x` = subtask. Include acceptance criteria (AC), estimation (SP), owner (DRI), dependencies (Deps).

### IG‑721 — CSV Ingest Wizard (FE/BE)
- **IG‑721‑1 FE:** Wizard scaffold (steps, routing, MUI) — **5 SP** — *DRI: FE‑A* — AC: navigate next/back, persist draft.
- **IG‑721‑2 FE:** Schema mapping UI (drag‑map columns→entities, validators) — **8 SP** — *DRI: FE‑B* — AC: invalid maps blocked, tooltip docs.
- **IG‑721‑3 FE:** PII flags & license picker (CC‑BY/ODC/Custom) — **3 SP** — *DRI: FE‑A* — AC: flags persisted, license stored.
- **IG‑721‑4 BE:** CSV ingest API (`POST /ingest/csv`, idempotency) — **5 SP** — *DRI: BE‑A* — AC: >1M rows chunked, backpressure, 429 on surge.
- **IG‑721‑5 BE:** Mapping compiler → canonical entities; error report — **5 SP** — *DRI: BE‑B* — AC: rejects unmapped fields with reason.
- **IG‑721‑6 QA:** Golden sample E2E checklist — **2 SP** — *DRI: QA* — AC: pass on sample ≤10 min.
**Deps:** none. **Exit:** E2E import produces nodes/edges with PII+license attrs.

### IG‑722 — NL→Cypher (preview)
- **IG‑722‑1 AI:** Prompt templates & safety guardrails (deny writes) — **5 SP** — *DRI: AI* — AC: ≥95% syntactic validity on suite.
- **IG‑722‑2 BE:** `/copilot/preview` endpoint, schema — **3 SP** — *DRI: BE‑A* — AC: returns Cypher + cost/row estimate.
- **IG‑722‑3 Graph:** Cost/row estimator (EXPLAIN plan parse) — **5 SP** — *DRI: Graph* — AC: estimates within ±20% on 10 queries.
- **IG‑722‑4 FE:** Preview panel UI with copy‑to‑clipboard — **3 SP** — *DRI: FE‑B* — AC: shows query, estimates, risks.
- **IG‑722‑5 BE:** Logging + PII scrubbing of prompts — **3 SP** — *DRI: BE‑B* — AC: audit fields present, no PII persisted.
- **IG‑722‑6 QA:** Unit tests + contract tests — **3 SP** — *DRI: QA* — AC: 90%+ cov on module.
**Deps:** IG‑723‑1 for sandbox execution (read‑only role). **Exit:** preview usable w/o DB writes.

### IG‑723 — Sandbox & Tri‑Pane UI
- **IG‑723‑1 BE/Graph:** Sandbox executor (read‑only role, timeouts, undo log) — **5 SP** — *DRI: BE‑A* — AC: denies writes, kills >5s.
- **IG‑723‑2 FE:** Cytoscape graph wiring + selection/brush sync — **8 SP** — *DRI: FE‑A* — AC: sync ≤100ms across panes.
- **IG‑723‑3 FE:** Timeline + Map (Mapbox) panels, jQuery interactions — **5 SP** — *DRI: FE‑B* — AC: pan/zoom/hover synced.
- **IG‑723‑4 QA:** Playwright E2E (preview→sandbox→tri‑pane render) — **3 SP** — *DRI: QA* — AC: screenshots baseline committed.
**Deps:** IG‑722 preview available. **Exit:** demo flow functional end‑to‑end.

### IG‑724 — Provenance & Claim Ledger (service + UI)
- **IG‑724‑1 Graph:** Neo4j schema (Claim, Evidence, License, Authority) + indexes — **5 SP** — *DRI: Graph* — AC: constraints in place.
- **IG‑724‑2 BE:** Prov‑Ledger service (REST), idempotency, outbox — **8 SP** — *DRI: BE‑B* — AC: OpenAPI + golden tests.
- **IG‑724‑3 BE:** Export manifest generator (Merkle over artifacts) — **5 SP** — *DRI: BE‑A* — AC: external verifier PASS.
- **IG‑724‑4 FE:** Provenance tooltip + "Explain this view" overlay — **3 SP** — *DRI: FE‑A* — AC: source/license/confidence visible.
**Deps:** none. **Exit:** evidence/claims persisted & inspectable; bundles exportable.

### IG‑725 — Disclosure Bundle Export
- **IG‑725‑1 BE:** `GET /bundles/:id/export` (manifest + files) — **3 SP** — *DRI: BE‑A* — AC: checksum verified; size guard.
- **IG‑725‑2 FE:** Download packager UI — **3 SP** — *DRI: FE‑B* — AC: shows size, hash, license summary.
**Deps:** IG‑724‑3. **Exit:** analyst can export verifiable bundle.

### IG‑726 — ABAC/OPA + Policy Labels
- **IG‑726‑1 BE:** OPA integration in GraphQL gateway — **5 SP** — *DRI: BE‑B* — AC: deny/allow with reason.
- **IG‑726‑2 Graph:** Policy labels on nodes/edges; context (`purpose`, `legalBasis`) — **5 SP** — *DRI: Graph* — AC: label audit trail.
- **IG‑726‑3 FE:** Reason‑for‑access prompt + appeal link — **3 SP** — *DRI: FE‑A* — AC: blocked export shows readable reason.
- **IG‑726‑4 QA:** Policy tests (positive/negative) — **3 SP** — *DRI: QA* — AC: coverage ≥90% on policy pack.
**Deps:** none. **Exit:** unauthorized export blocked with logged appeal path.

### IG‑727 — Observability & Cost Guards
- **IG‑727‑1 DevX:** OTEL traces gateway→copilot→graph — **5 SP** — *DRI: DevX* — AC: spans viewable in Tempo/Jaeger.
- **IG‑727‑2 DevX:** Prometheus metrics + Grafana SLO dashboard — **5 SP** — *DRI: DevX* — AC: p95 query latency panel.
- **IG‑727‑3 Graph/BE:** Query budgeter + slow‑query killer — **5 SP** — *DRI: BE‑A* — AC: kill & audit entries after threshold.
- **IG‑727‑4 QA:** k6 perf suite, chaos drills — **3 SP** — *DRI: QA* — AC: baseline reports attached to CI.
**Deps:** basic endpoints live. **Exit:** SLOs observable; guardrails active.

**Total planned:** **78 SP** (buffer 2–6 SP for unplanned).

---
## Day‑by‑Day Sequencing
- **D1–D2:** IG‑724‑1/‑2 schema+service; IG‑722‑1 templates; IG‑721‑1/‑4 scaffolds; IG‑727‑1 traces.
- **D3–D4:** IG‑722‑2/‑3 preview+cost; IG‑723‑1 sandbox; IG‑721‑2 mapping UI; IG‑726‑1 OPA.
- **D5:** IG‑723‑2/‑3 tri‑pane wiring; IG‑724‑3 manifest; IG‑727‑2 dashboard.
- **D6:** IG‑722‑4/‑5 FE preview + scrubbing; IG‑726‑2 policy labels; IG‑721‑5 compiler.
- **D7:** IG‑724‑4 tooltip; IG‑725‑1 export API; IG‑727‑3 guard; E2E first pass.
- **D8:** IG‑721‑6 QA; IG‑726‑3 FE prompt; IG‑725‑2 UI; k6 & chaos.
- **D9:** IG‑723‑4 E2E; polish UX; docs; demo dataset finalization.
- **D10:** Freeze, stakeholder demo, retro, release tag.

---
## Acceptance Criteria Snapshot
- **Preview:** ≥95% valid Cypher; cost estimate shown.
- **Sandbox:** write ops blocked; timeouts enforced.
- **Tri‑pane:** ≤100ms sync; hover shows provenance.
- **Prov‑Ledger:** export manifest verifies (hashes & chain).
- **ABAC/OPA:** unauthorized export blocked with reason+appeal.
- **SLO:** p95 latency visible; slow queries killed & audited.

---
## Risk Register & Mitigation
- **Cypher safety gaps** → static lint + denylist + read‑only role; e2e negative tests.
- **Manifest bugs** → golden tests + external verifier; Merkle inclusion proofs.
- **Latency spikes** → query budget + killer; pre‑warm cache; circuit breakers.
- **Prompt PII** → scrubbing + privacy config; redaction presets.

---
## CI/CD & Branching
- **Branches:** `feature/prov-ledger`, `feature/copilot-nl2cypher`, `feature/tri-pane-ui`, `feature/abac-opa`, `feature/csv-wizard`, `feature/connector-stix`, `feature/observability-guards`.
- **PR checks:** ESLint/Prettier; Jest/Supertest; Playwright; k6; OPA policy tests; Helm/Terraform lint; OWASP/ZAP passive.
- **Envs:** Ephemeral preview per PR; canary on `develop`; tag `v0.7.0-beta` at end.

---
## Test Plans (extract)
- **Playwright (E2E):** ingest→preview→sandbox→tri‑pane→export; baseline screenshots; 5 critical paths.
- **k6 (perf):** 50 VUs, 10m soak; SLO p95 ≤ 1.5s for preview; ≤ 3s tri‑pane render on 50k nodes/100k edges demo graph.
- **OPA Policies:** deny‑by‑default, allow on purpose=“investigation” with lawful basis; table‑driven tests.

---
## Definitions
- **DoR:** sample data, policy labels, tests outlined, rollback noted.
- **DoD:** 90%+ coverage on new modules; docs; flags listed; demo script recorded; security checklist signed.

---
## Demo Script (Rapid Attribution — CTI)
1) Import STIX feed via CSV wizard (PII+license flagged).  
2) Ask: “Show infrastructure pivot from malware X across last 90 days.”  
3) Preview Cypher + cost; run in sandbox; tri‑pane updates.  
4) Hover nodes to show provenance.  
5) Export bundle; show manifest & verifier PASS.  
6) Attempt unauthorized export; policy reason appears; appeal link shown.


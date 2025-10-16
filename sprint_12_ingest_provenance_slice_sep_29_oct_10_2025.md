# Sprint 12 — Ingest & Provenance Slice (Sep 29–Oct 10, 2025)

## 0) TL;DR

**Goal:** Deliver a vertical slice from **CSV upload → schema mapping → ingest with provenance → tri‑pane view → export gating by license**. Ship a small but verifiable increment that proves our ethics‑by‑design and analyst UX in one sprint.

---

## 1) Sprint Goal & Theme

- **Theme:** _“Ingest → Verify → View”_ — prove that we can take a real CSV, map it to the canonical model, ingest with lineage, visualize it in the tri‑pane, and block/export with license reasons.
- **Outcome:** A demoable case where an analyst maps a CSV to entities/edges in ≤10 minutes, inspects provenance, explores data on **timeline/map/graph**, and sees **export blocked** with a human‑readable license clause when rules demand.

**Definition of Success (DoS):**

1. CSV→Canonical mapping wizard completes in **≤10 minutes** on sample dataset; PII flags and policy reasons render.
2. Ingested entities/edges persist with full **transform chain** recorded; export produces a **verifiable manifest**.
3. **Tri‑pane** renders the ingested subgraph with synchronized brushing and one saved view.
4. Attempted export of a restricted slice shows **license clause + owner + override workflow**.

---

## 2) Sprint Backlog (Stories → Acceptance → Points)

> Target commit: **26 points** (80% of last‑3‑sprint average). WIP limit: 2 per engineer.

### S1 — CSV Schema Mapper (Wizard v0.9)

- **As an** analyst, **I want** to upload a CSV/JSON and map fields to canonical entities/relationships **so that** I can ingest data without writing code.
- **Acceptance:**
  - Upload CSV; AI‑assisted field suggestions; manual edits allowed.
  - PII classification highlights sensitive fields; blocked fields display policy reasons.
  - Mapping persisted; **end‑to‑end mapping time ≤10 minutes** on “Org‑People‑Events.csv”.
- **Deliverables:** UI steps (Upload ▸ Map ▸ Validate ▸ Preview ▸ Save), mapping JSON, unit tests on fixtures.
- **Estimate:** **8 pts**

### S2 — Streaming ETL (Thin Path)

- **As a** platform, **I want** to process the mapped file via ETL with basic enrichers **so that** lineage and hashes exist for provenance.
- **Acceptance:**
  - ETL job reads mapping JSON; emits entities/edges; computes checksum; logs lineage.
  - Enrichers (v0): language detect, hash, EXIF scrub (stub) wired; toggled via config.
- **Deliverables:** ETL job, config, golden IO tests.
- **Estimate:** **3 pts**

### S3 — Provenance & Claim Ledger Integration

- **As a** compliance officer, **I want** ingest outputs to register evidence and transformations **so that** exports are verifiable.
- **Acceptance:**
  - Every ingest run registers a claim bundle with **hash tree + transform chain**.
  - Export produces a manifest verifiable by the standalone verifier.
- **Deliverables:** service client, manifest generator, verifier CLI script, fixtures.
- **Estimate:** **5 pts**

### S4 — Data License Registry (Export Gate v0.1)

- **As a** data steward, **I want** export gating by source license **so that** unlicensed exports are blocked with human‑readable reasons.
- **Acceptance:**
  - When export violates license rules, UI shows **license clause + owner + override workflow**.
  - Audit log records reason‑for‑access and any override.
- **Deliverables:** policy rules, UI dialog, audit hook, tests.
- **Estimate:** **5 pts**

### S5 — Tri‑Pane “First Light” (View v0.1)

- **As an** analyst, **I want** to explore ingested data across **timeline/map/graph** **so that** I can spot patterns quickly.
- **Acceptance:**
  - Tri‑pane loads the ingested subgraph; synchronized time‑brushing; save one named view.
  - Basic “Explain this view” stub opens with provenance tooltips.
- **Deliverables:** tri‑pane shell, sync cursor, saved view store, smoke tests.
- **Estimate:** **3 pts**

### S6 — ER Reconcile (Read‑Only Candidates)

- **As an** analyst, **I want** to see candidate entity matches with explainable features **so that** I can plan merges next sprint.
- **Acceptance:**
  - Show candidate match list for People/Orgs with rationale chips; merges **not** enabled.
- **Deliverables:** API stub `/er/candidates`, UI table, fixtures.
- **Estimate:** **2 pts**

> **Out of scope this sprint:** merges/splits, full OCR/STT, NL graph querying, RAG brief generation.

---

## 3) Task Breakdown (per Story)

**S1**: UX wireflows ▸ AI suggestor prompts ▸ PII rules ▸ Validation engine ▸ Mapping persistence ▸ Unit tests.
**S2**: ETL runner ▸ Mapping adapter ▸ Enricher hooks ▸ Lineage emitter ▸ Golden IO tests.
**S3**: Claim model ▸ Hash tree builder ▸ Transform chain capture ▸ Export manifest ▸ Verifier CLI.
**S4**: License policy schema ▸ Gate middleware ▸ UI dialog (reason/owner/appeal) ▸ Audit event ▸ Tests.
**S5**: Graph/timeline/map shells ▸ Shared time cursor ▸ Saved views ▸ Provenance tooltip stub.
**S6**: Candidate scoring API stub ▸ Feature chips (name, alias, geo‑temporal) ▸ Fixtures ▸ UI table.

---

## 4) Non‑Functional & Guardrails (Sprint‑Scoped)

- **Performance:** p95 tri‑pane initial load for slice ≤1.5s; ingest 10k rows ≤5m E2E.
- **Security/Governance:** record who/what/why for exports; step‑up auth for overrides.
- **Accessibility:** keyboard first; focus rings; color‑safe contrasts.
- **Observability:** OTEL traces around ETL; Prom metrics for ingest throughput and UI TTFI.

---

## 5) DoR / DoD

**Definition of Ready (DoR)**

- Sample CSV + mapping targets agreed; UX wireframes reviewed; policies for license classes defined; envs provisioned.

**Definition of Done (DoD)**

- All acceptance criteria met; unit + integration tests green; audit events captured; docs updated; demo script rehearsed; feature flags configurable.

---

## 6) Environments & Feature Flags

- **Flags:** `ingestWizard.v0`, `provLedger.exportManifest`, `licenseGate.v0`, `triPane.v0`, `er.candidatesOnly`.
- **Envs:** dev ▸ stage ▸ prod; ephemeral preview env per PR via feature flag.

---

## 7) Dependencies

- Canonical model facets for Person/Org/Event.
- Audit service endpoints; AuthN step‑up flow; Map/Timeline components (existing libs ok).

---

## 8) Risks & Mitigations

- **Scope creep in wizard** → freeze flow; backlog advanced options.
- **Manifest verification friction** → provide CLI + fixtures; pre‑baked demo manifest.
- **Tri‑pane perf** → lazy load + capped node count + cached layout.
- **Policy ambiguity** → seed with 3 license exemplars; product council sign‑off mid‑sprint.

---

## 9) QA Plan (Representative Tests)

- **S1** Gherkin:
  - _Given_ a 2k‑row CSV, _when_ I map fields with AI suggestions, _then_ wizard completes in **≤10 minutes** and blocked fields show policy reasons.
- **S3**:
  - _Given_ an ingest run, _when_ I export a case, _then_ a manifest with **hash tree + transform chain** is produced and verified by CLI.
- **S4**:
  - _Given_ an export with restricted data, _when_ I click Export, _then_ UI shows **license clause + owner + override workflow** and logs an audit event.
- **S5**:
  - _Given_ a saved view, _when_ I drag the timeline, _then_ map/graph filter in sync.

---

## 10) Analytics & Telemetry

- **Wizard:** step funnel (drop‑offs), mapping time, AI suggestion accept rate.
- **ETL:** records/min, error rate, lineage events/record.
- **Tri‑pane:** TTFI, interaction rate, saved views count.
- **Export Gate:** block rate by license class; override frequency.

---

## 11) Ceremony Cadence (America/Denver)

- **Daily Stand‑up:** 9:30a (15m).
- **Backlog Grooming:** Wed 2:00p (45m).
- **Sprint Review/Demo:** Fri Oct 10, 11:00a (45m).
- **Retro:** Fri Oct 10, 2:00p (45m).

---

## 12) Demo Script (Sprint Review)

1. Upload CSV → AI‑assisted mapping → PII flags.
2. Kick ETL → lineage preview.
3. Open case in tri‑pane; brush time; save view.
4. Attempt export → blocked with license clause & owner; show override path.
5. Run verifier CLI on exported manifest.

---

## 13) Release & Rollback

- **Release:** behind flags; gradual ramp via tenant allowlist.
- **Rollback:** disable flags; revert to prior export path; manifests remain verifiable.

---

## 14) Owners

- **Feature Lead:** PM/EM pair.
- **S1:** FE + UX
- **S2:** Data Eng
- **S3:** Platform/Backend
- **S4:** FE + Policy
- **S5:** FE + Visualization
- **S6:** BE + FE

---

## 15) Backlog (Next Sprint Seed)

- ER merge/split with reversible merges and override logs.
- NL Graph Query preview + diff vs manual queries.
- Report Studio: one‑click PDF with redaction.

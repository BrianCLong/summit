# 🗡️ Council of Spies & Strategists — Sprint Plan (Q4 2025)

> Ceremonial Opening: “Let shadows convene and voices of cunning speak. The chamber is in session.”

## Sprint Goal (14 days)
Deliver a **vertical, auditable slice** from **Ingest → Resolve → Analyze → Query → Report**, gated by **ABAC/OPA** and **immutable audit**, with a first pass of the **Provenance & Claim Ledger**. Outcome: an analyst ingests a CSV, maps to canonical entities, resolves duplicates, explores the subgraph in the tri‑pane UI, asks a natural‑language question (read‑only), and exports a **disclosure bundle** with a verifiable manifest.

---
## Why These Priorities (Signals from the Council)
- **Core GA slice** is explicitly called for near‑term: ingest/graph/analytics/copilot + ABAC/OPA + audit + tri‑pane UI + ≥10 connectors.
- **Provenance > prediction** and **oversight by design** are bedrock principles. The ledger and audit must ship with the slice.
- **Operate degraded** and **observability** start this sprint (dashboards + cost guards skeletons); deeper offline kit in a follow‑up.

---
## Scope & Deliverables
### 1) Data Intake & ETL Assistant (MVP)
- **Connectors (v0):** CSV upload + S3 bucket pull.
- **Ingest Wizard:** schema mapping UI with AI suggestions, field validation, PII flags, license/source capture.
- **Streaming ETL:** enrichment stubs (hash, language), EXIF strip on images (if present), OCR stub wired behind a flag.
- **Done =** mapped entities land in canonical model with lineage recorded.

### 2) Canonical Graph Core (v0.9)
- **Types:** Person, Org, Asset, Account, Location, Event, Document, Claim, Case.
- **Temporal fields:** observedAt/recordedAt + validFrom/validTo scaffolding.
- **Policy labels:** origin, sensitivity, legalBasis, purpose, retention.

### 3) Entity Resolution (ER) (MVP)
- **Deterministic blockers:** email/phone/account/document checksum; phonetic name key.
- **Explain panel:** feature deltas + human override; reversible merges.

### 4) Provenance & Claim Ledger (beta stub)
- **Evidence registration:** checksum, source, transform chain.
- **Claim nodes:** attach confidence + citations to edges/nodes.
- **Export manifest:** hash tree + transform chain (verifiable JSON).

### 5) AI Copilot (Read‑Only NL→Cypher)
- **Prompt → generated Cypher preview** with cost/row estimate; sandbox execution (read‑only) with rollback.
- **Guardrails:** show citation/warnings; block if policy labels disallow.

### 6) Analyst Experience (Tri‑Pane v1)
- **Graph + Timeline + Map** synchronized brushing; pinboard save; provenance tooltips; confidence opacity.

### 7) Governance & Security (Foundations)
- **ABAC/OPA** enforcement on read paths; need‑to‑know via policy labels.
- **Immutable audit**: who/what/why/when with reason‑for‑access prompt.

### 8) Observability & Cost Guard (Foundations)
- **OTEL traces + Prom metrics** for ingest & query paths.
- **SLO dashboard (starter):** p95 graph query, ingest E2E, error rates.
- **Cost guard skeleton:** query cost estimate + budget fields (no hard enforcement yet).

### 9) Reporting & Disclosure (MVP)
- **Brief/Report studio:** export a SITREP with figures from graph snapshots only.
- **Disclosure packager:** bundle evidence + manifest + license terms.

---
## Acceptance Criteria (per workstream)
1. **Ingest Wizard**
   - Map a 5k‑row CSV → canonical in ≤10 minutes with AI suggestions; PII fields flagged; license recorded.
   - Lineage captured for every field; blocked fields show human‑readable policy reason.
2. **Graph Core**
   - Time‑slice query returns consistent neighborhood snapshot; unknown types render safely.
3. **ER**
   - Deterministic merges reproducible on golden sample; **Explain** shows features & override log; merges reversible.
4. **Provenance & Ledger**
   - Export produces manifest (hash tree + transform chain) verifiable by the external verifier script.
5. **Copilot**
   - ≥95% syntactic validity on test prompts; query preview shows cost; undo/rollback works.
6. **Tri‑Pane**
   - Analyst can brush time to filter graph + map; tooltips show provenance; save/load a view.
7. **ABAC/OPA + Audit**
   - Attempted access without legal basis → denied with reason; all reads log who/what/why.
8. **Observability**
   - Dashboards live with p95 graph query, ingest latency, error rate; alert on SLO breach.
9. **Disclosure**
   - Generated brief includes CH/COI table slots, confidence bands, and citations; bundle passes verifier.

---
## Sprint Backlog (Epics → Stories)
### EPIC A — Ingest & ETL
- A1. CSV Upload UI + S3 connector
- A2. Schema Mapper + AI hints (top‑1)
- A3. PII classifier (lite) + license capture
- A4. ETL pipeline (hash/lang + EXIF strip)

### EPIC B — Graph Core & ER
- B1. Canonical schema v0.9 + migrations
- B2. Policy labels + OPA bindings
- B3. ER deterministic rules + Explain UI

### EPIC C — Ledger & Disclosure
- C1. Evidence registry API + checksums
- C2. Claim node model + attach to edges
- C3. Manifest generator + verifier script
- C4. Disclosure bundle export (ZIP)

### EPIC D — Copilot & Query UX
- D1. NL→Cypher generator (read‑only)
- D2. Cost/row estimator + sandbox runner
- D3. Guardrails UI (block with reason)

### EPIC E — Tri‑Pane UX
- E1. Graph viewer + pinboard
- E2. Timeline + brushing → graph
- E3. Map pane + geofilter

### EPIC F — Governance & Audit
- F1. ABAC via OPA for read paths
- F2. Reason‑for‑access prompts
- F3. Immutable audit sink + viewer

### EPIC G — Observability & Cost
- G1. OTEL spans on ingest/query
- G2. Prom metrics + SLO panel
- G3. Cost guard scaffolding

---
## Definition of Done (Sprint)
- All AC above pass; security review (STRIDE skim) with **zero criticals**; dashboards populated; demo scenario runs end‑to‑end with seeded dataset; docs updated (runbook + model cards + data contracts).

---
## Demo Script (End‑to‑End)
1. Upload CSV (persons/orgs/relations); map fields; see PII and license flags.
2. Run ETL; open case; watch entities materialize with provenance tooltips.
3. ER panel: resolve duplicates; show Explain; undo a merge.
4. Ask: “Show paths between Org‑X and Account‑Y in 2024.” Preview Cypher; run; inspect tri‑pane.
5. Export **Disclosure Bundle**; open manifest; verify hash chain.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** architecture, OPA, ledger APIs.
- **Backend (2):** ingest, ER, manifest, metrics.
- **Frontend (2):** wizard, tri‑pane, copilot UI.
- **Platform (1):** OTEL/Prom, SLO dashboards, CI.
- **PM/Design (1):** AC, demo script, docs.
- **Security/Ombuds (0.5):** policy reasons, audit review.

---
## Risks & Mitigations
- **Scope creep** in Copilot → keep **read‑only**; no write mutations.
- **Policy complexity** → start with read paths + minimal label set; simulate before expand.
- **ER quality** → MVP deterministic only; defer probabilistic to next sprint; keep reversible.
- **Latency regressions** → cost guard + budget estimator early; alert SLO breaches.

---
## Metrics for this Sprint
- TTFI for first insight from ingest < 15m.
- p95 3‑hop query < 1.5s on seeded dataset.
- 100% of reads carry reason‑for‑access; 100% export bundles verifiable.
- Demo pass rate: 100% on run‑of‑show.

---
## Stretch (pull if we run hot)
- Add **RSS** + **STIX/TAXII** connectors (read‑only) to hit 4 connectors.
- Offline Kit v0: local‑only tri‑pane + signed sync logs.
- SLO alerts for cost spikes (query budgeter warn‑only).

---
## Next Sprint (preview)
- Probabilistic ER + adjudication queues.
- Pattern miner (co‑presence) + anomaly scoring.
- Runbook library (R11 Campaign Graph Builder; R16 High‑Fidelity Alert Triage).
- Cost guard enforcement; offline kit v1; connector marketplace scaffolding.

---
*Chair’s Closing:* “Compartmentalize. Prioritize. Deliver. The mountain is already behind us.”


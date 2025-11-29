# Sprint 14 — “Copilot & Controls” (Dec 1–12, 2025, America/Denver)

> **Window:** Mon, Dec 1 → Fri, Dec 12, 2025 (10 business days)
> **Theme:** Ship the first analyst-visible **NL Graph Querying** MVP, a **one-path CSV Ingest Wizard** with license/PII guardrails, and core **Audit/Governance** hooks (reason-for-access + OPA/ABAC). These align with the near-term roadmap (Core GA: ingest/graph/analytics/copilot; ABAC/OPA; audit) and keep tri-pane UI as a stretch.

---

## 1) Sprint Goals

- **NL Graph Querying (MVP):** prompt → generated **Cypher preview** with row/cost estimates; sandboxed execution; undo/rollback. **Acceptance:** ≥95% syntactic validity on test prompts; rollback supported.
- **Ingest Wizard (CSV happy-path):** map flat CSV→canonical entities with **AI mapping hints**, **PII classification**, and **license rules**; record lineage. **Acceptance:** CSV/JSON mapped ≤10 min; PII flags; blocked fields show policy reasons.
- **Data License Registry (MVP):** track license on source; **block export** with human-readable reason + appeal path. **Acceptance:** blocked export shows clause/owner/override workflow.
- **Audit & Governance Hooks:** ABAC/RBAC + externalized **OPA** policies; **reason-for-access prompts** in UI; log who/what/why/when.
- **Observability & Cost Guard (instrumentation):** OTEL traces, Prom metrics, latency heatmap scaffolding; enable query budgeter/slow-query killer flags.

**Out of scope (tracked as next):** Graph-XAI overlays, predictive suite alpha, multi-graph federation; adhere to “Won’t Build” ethics gate.

---

## 2) Epics → Stories (Definition of Done included)

### Epic A — NL Graph Querying (Copilot)

- **A1. Prompt → Cypher generator service (Node/Apollo):** deterministic templates; returns `cypher`, `rowEstimate`, `costHint`.
  - **DoD:** 50 gold prompts → ≥95% syntactic pass; failing prompts surface fix hints.
- **A2. Sandbox executor:** read-only, result row cap, timed cancel, **undo/rollback** for any write classes (guarded off for MVP).
  - **DoD:** killing long queries works; budget hints logged.
- **A3. Web UI panel (React 18 + MUI + Cytoscape.js + jQuery for interactions):** left = prompt, middle = **Cypher preview**, right = results/row estimates; **diff vs manual** query.
  - **DoD:** keyboard-first; accessible labels; preview must match executed query.
- **A4. Unit/contract tests:** prompt fixtures; Cypher schema safety checks; cost hint bounds.
  - **DoD:** Jest ≥90% statements, golden fixtures in repo.

### Epic B — Ingest Wizard (CSV Happy-Path)

- **B1. Upload→Schema map step:** AI field suggestions; manual overrides; **PII classifier** tags; DPIA checklist saved.
  - **DoD:** demo CSV (people/orgs/events) maps in ≤10 minutes; lineage captured.
- **B2. License attach & enforcement:** source select → license bound to dataset; blocked fields explain **why**.
  - **DoD:** export attempt from licensed dataset shows clear reason/appeal path.
- **B3. ETL enrichers (scaffold):** GeoIP + hash + OCR stub wired; EXIF scrub.
  - **DoD:** enrich steps recorded in lineage; toggles visible.

### Epic C — Audit, Access & Governance

- **C1. ABAC/RBAC + OPA integration:** policy labels + case roles; **step-up auth** hooks (stub).
  - **DoD:** policy unit tests; blocking paths verified in stage.
- **C2. Reason-for-access prompt (UI modal + API):** capture purpose string; write to immutable audit.
  - **DoD:** audit shows who/what/**why**/when; search by purpose.
- **C3. Export blocker (License/Authority):** **authority/permit** required at export; refusal returns actionable message + appeal link.
  - **DoD:** simulated export without proper basis fails with readable rationale.

### Stretch — Tri-Pane UX scaffold

- Sync **timeline + map + graph** cursors; save/pin views; “Explain this view” placeholder.
  - **Acceptance basis:** synchronized brushing + usability metrics tracked.

---

## 3) Engineering Plan (by layer)

**Frontend (React 18 + MUI + Cytoscape.js; jQuery for DOM/events)**

- Copilot panel & schema-mapper wizard; accessible forms; keyboard-first; jQuery `$.ajax` wrappers for executor calls.
- Guard any data export buttons with license/authority checks and reason-for-access prompt.

**Graph/Backend (Node 18, Apollo GraphQL, Neo4j driver)**

- Services: `/copilot/generateCypher`, `/query/sandbox`, `/audit/log`, `/license/check`.
- Policy middleware: OPA evaluation pre-query; attach **purpose** to context; record immutable audit.

**ETL/Enrichers**

- CSV parser with mapping presets; PII classifier stub + flags; enrichers (GeoIP/hash/EXIF scrub) chained with provenance nodes.

**Security/Governance**

- ABAC policy schema + role matrix; start warrant/authority fields on queries; export refusals show clause/owner/review path.

**Observability & Cost**

- OTEL tracing, Prom metrics; latency heatmap endpoint; flip on **query budgeter/slow-query killer** (feature-flag).

---

## 4) Acceptance & Demo Plan

**Demo script (Fri, Dec 12):**

1. Load sample CSV → map fields with AI suggestions; see **PII flags**; run DPIA checklist; import completes ≤10 minutes.
2. Ask Copilot: “Show orgs within 2 hops of *X* active in 2024” → preview **Cypher & row/cost**; execute sandbox; undo. **Pass if** syntactic validity ≥95% on the gold set.
3. Attempt export on licensed data **without authority** → export blocked with human-readable reason and appeal path.
4. Show **reason-for-access** audit for a sensitive view.

---

## 5) Risks & Mitigations

- **Prompt→Cypher hallucinations** → start with constrained templates & fixtures; non-passing prompts fall back to manual query diff.
- **Export compliance complexity** → keep MVP to license/authority gates only; appeals logged for ombuds.
- **Performance regressions** → enable cost guard + SLO dashboards early.

---

## 6) Tracking Artifacts (proposed)

- **Branches:**
  - `feature/copilot-nl-cypher`, `feature/ingest-wizard-csv`, `feature/audit-opa`
- **PR labels:** `area:copilot`, `area:ingest`, `area:audit`, `type:feature`, `needs:security-review`
- **CI gates:** unit tests; GraphQL contract tests; schema migration check; axe-core accessibility scan.

---

## 7) Metrics (sprint exit)

- **Copilot validity:** ≥95% syntactic pass on 50 prompts.
- **Ingest time:** CSV→entities ≤10 minutes; lineage present.
- **Audit coverage:** 100% of sensitive queries capture **reason-for-access**.
- **Ops:** latency heatmap visible; cost guard flags enabled.

---

## 8) Stretch Goals (if ahead)

- **Provenance/Claim Ledger (beta)** export manifest for the CSV import.
- **Tri-pane sync** (timeline/map/graph) with minimal brushing.

---

## 9) Definition of Done (global)

- Meets stated acceptance criteria; passes security & ethics gate (**no “won’t build” violations**); artifacts logged in immutable audit; docs updated; demo delivered.

---

### Revised prompt (for next time)

> “Plan a 2-week IntelGraph sprint (Dec 1–12, 2025) to ship NL Graph Querying MVP, CSV Ingest Wizard with PII & license enforcement, and audit/OPA hooks. Include epics→stories with DoD, demo plan, risks, metrics, and citations to the Council Wishbooks.”

### Quick questions to sharpen execution

1. Which sample CSV schema should we standardize on for the demo (people/orgs/events or different)?
2. Any must-have gold prompts beyond basic 2–3 hop and time-slice queries?
3. Do you want the tri-pane sync as stretch or move it into core this sprint?

*(All planning choices above trace directly to the Council backlogs and acceptance criteria for NL Querying, Ingest Wizard, License/Authority enforcement, Audit/OPA, and Ops/Cost Guard.)*

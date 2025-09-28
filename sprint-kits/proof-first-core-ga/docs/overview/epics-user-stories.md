# Epics, User Stories, and Acceptance Criteria

## Epic A: Provenance & Claim Ledger (beta)

### A1. Evidence Registration & Transform Tracking

- **User story:** As an analyst I want to register evidence with immutable lineage so that I can export a verifiable manifest.
- **Acceptance criteria:**
  - `POST /evidence/register` persists source hash and metadata.
  - Transform steps record operation, model + version, and config checksum.
  - Export produces `hash-manifest.json` (Merkle tree).

### A2. External Verifier (CLI)

- **User story:** As a compliance reviewer I want a CLI to verify a manifest against fixtures so that integrity can be independently audited.
- **Acceptance criteria:**
  - `prov-verify fixtures/case-demo` exits 0 on an untampered bundle.
  - Tamper detection returns a non-zero exit code and a human-readable diff report.

### A3. License/Authority Blockers on Export

- **User story:** As an approver I want export evaluation against license/authority policies so that non-compliant exports are blocked with reasons.
- **Acceptance criteria:**
  - Blocked export responses include `{reason, license_clause, owner, appeal_path}`.

## Epic B: NL→Cypher Copilot (auditable)

### B1. Prompt→Preview→Sandbox Execution

- **User story:** As an analyst I want to see generated Cypher with cost preview before running so that I can avoid runaway queries.
- **Acceptance criteria:**
  - `nl_to_cypher(prompt, schema)` returns `{cypher, cost_estimate}`.
  - Sandbox execution returns preview data and supports undo/redo.

### B2. Quality & Safety Gates

- **User story:** As a lead I want ≥95% syntactic validity and rollback capability so that productivity is high and safe.
- **Acceptance criteria:**
  - Test corpus yields ≥95% syntactic validity.
  - Diffs tracked against manual Cypher snapshots; rollback path is tested.

## Epic C: Entity Resolution (v0)

### C1. Candidate Generation & Merge

- **User story:** As an analyst I want candidate pairs and reversible merges so that I can safely adjudicate entities.
- **Acceptance criteria:**
  - `/er/candidates` and `/er/merge` endpoints exist.
  - Merges are reversible and audit logs include user and reason.

### C2. Explainability Endpoint

- **User story:** As an analyst I want `/er/explain` with feature vectors and rationale so that I can trust merges.
- **Acceptance criteria:**
  - Explain responses list blocking features, scores, and rationale.

## Epic D: Ops (SLO + Cost Guard)

### D1. SLO Dashboards

- **User story:** As an SRE I want OTEL/Prometheus dashboards for p95 graph latency so that we can enforce SLOs.
- **Acceptance criteria:**
  - Dashboards deployed with alerts firing under induced load.

### D2. Cost Guard (budgeter + killer)

- **User story:** As an SRE I want plan-budget evaluation and slow-query kill so that costs and availability remain stable.
- **Acceptance criteria:**
  - Synthetic hog queries are killed and events appear on dashboards and alert channels.

## Epic E: UI – Tri-Pane + Explain View

### E1. Tri-Pane Integration (graph/map/timeline)

- **User story:** As a user I want synchronized panes with saved views so that exploration is fast.
- **Acceptance criteria:**
  - Brushing synchronizes across panes; saved views persist and reload.

### E2. Explain This View

- **User story:** As a user I want evidence/provenance overlays and policy bindings so that every assertion is accountable.
- **Acceptance criteria:**
  - Tooltips show provenance and confidence; Explain panel lists evidence nodes and policies.

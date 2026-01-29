# Decision Log: SSDF v1.2 Subsumption Bundle

## Context
Integrating NIST SSDF v1.2 (IPD) alignment into Summit.

## Decisions

### 1. Clean-Room Mapping
- **Decision:** Use IDs only, no verbatim SSDF text.
- **Rationale:** Avoid copyright/IP issues, focus on verifiable controls.

### 2. Machine-Verifiable Evidence
- **Decision:** Use deterministic JSON artifacts (`report`, `metrics`, `stamp`).
- **Rationale:** Enables drift detection and automated auditing.

### 3. CI Gate
- **Decision:** Implement `verify_subsumption_bundle.mjs` to enforce bundle structure and evidence completeness.
- **Rationale:** Prevent "paper compliance" drift.

### 4. Patch-First Implementation
- **Decision:** Implement minimal skeleton first.
- **Rationale:** Validate approach and integration before heavy content mapping.

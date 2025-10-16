### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Provenance & Claim Ledger v0.9
Excerpt/why: "claim extraction stub (Claim nodes)"

### Problem / Goal

Implement `POST /claim` endpoint in the `prov-ledger` service to extract and register `Claim` nodes.

### Proposed Approach

Develop a stub API endpoint that accepts claim text and evidence references, creating placeholder `Claim` nodes in the graph.

### Tasks

- [ ] Define `Claim` node schema.
- [ ] Implement `POST /claim` endpoint (stub).
- [ ] Integrate with graph database to create `Claim` nodes.

### Acceptance Criteria

- Given a payload with claim text and evidence references, when `POST /claim` is called, then a `Claim` node is created in the graph.
- Metrics/SLO: Claim extraction stub p95 latency < 50ms.
- Tests: Unit tests for API endpoint and node creation.
- Observability: Logs for claim creation events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Implement evidence registration in prov-ledger service

### DOR / DOD

- DOR: Claim extraction stub design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Code: `prov-ledger` service
- Docs: SPRINT_PROVENANCE_FIRST.md

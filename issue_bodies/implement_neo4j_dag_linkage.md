### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.2 Data Model
Excerpt/why: "Neo4j: optional linkage: store DAG topology for graph queries & XAI overlays (nodes: Step; edges: Flow)."

### Problem / Goal

Store workflow DAG topology in Neo4j for graph queries and XAI overlays.

### Proposed Approach

Develop a process to extract the DAG structure from workflow definitions and persist it in Neo4j, mapping steps to nodes and connections to relationships.

### Tasks

- [ ] Define Neo4j schema for DAG topology.
- [ ] Implement DAG extraction from workflow definitions.
- [ ] Implement persistence of DAG to Neo4j.

### Acceptance Criteria

- Given a workflow definition, when processed, then its DAG topology is accurately represented and stored in Neo4j.
- Metrics/SLO: DAG persistence p95 latency < 200ms.
- Tests: Unit tests for DAG extraction, integration tests for Neo4j persistence.
- Observability: Logs for Neo4j write operations.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Neo4j DAG linkage design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md

### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1)
Excerpt/why: "GraphQL (optional): federate read‑only queries into the gateway (`workflow(id)`, `workflows`, `execution(id)`)."

### Problem / Goal

Develop a GraphQL read subgraph for workflows and executions, federating into the main gateway.

### Proposed Approach

Implement a GraphQL service that exposes read-only queries for workflow definitions and executions, and configure it to integrate as a subgraph with an Apollo Federation gateway.

### Tasks

- [ ] Define GraphQL schema for workflows and executions.
- [ ] Implement GraphQL resolvers for read queries.
- [ ] Configure subgraph for Apollo Federation.

### Acceptance Criteria

- Given a GraphQL query for workflows or executions, when sent to the gateway, then the subgraph correctly resolves the query and returns data.
- Metrics/SLO: GraphQL query p95 latency < 200ms.
- Tests: Unit tests for resolvers, integration tests for subgraph federation.
- Observability: GraphQL query metrics visible in dashboards.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: GraphQL subgraph design approved.
- DOD: Subgraph implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md

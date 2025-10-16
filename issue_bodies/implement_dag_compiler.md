### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.3 DSL & Validation
Excerpt/why: "Implement a **compiler** that produces a normalized DAG with: topological order, fan‑out limits, step timeouts, retry/backoff policy, and resource hints (CPU/mem/quota)."

### Problem / Goal

Develop a compiler that normalizes workflow DAGs, ensuring topological order, fan-out limits, timeouts, retry/backoff, and resource hints.

### Proposed Approach

Implement a compiler module that takes a raw workflow definition, performs static analysis to build a normalized DAG, and applies predefined constraints and policies.

### Tasks

- [ ] Implement DAG parsing and topological sort.
- [ ] Implement fan-out limit enforcement.
- [ ] Implement step timeout and retry/backoff policy application.
- [ ] Integrate resource hint processing.

### Acceptance Criteria

- Given a workflow definition, when compiled, then it produces a normalized DAG that adheres to topological order, fan-out limits, timeouts, retry/backoff, and includes resource hints.
- Metrics/SLO: DAG compilation p95 latency < 100ms.
- Tests: Unit tests for compiler logic, integration tests for DAG normalization.
- Observability: Logs for compilation events and errors.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Author JSON Schema for WorkflowDefinition

### DOR / DOD

- DOR: DAG compiler design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md

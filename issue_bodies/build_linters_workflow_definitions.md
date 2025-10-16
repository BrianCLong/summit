### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.3 DSL & Validation
Excerpt/why: "Build **linters**: missing timeouts, unbounded retries, orphaned outputs, secret usage without vault reference, policy label absence."

### Problem / Goal

Develop linters to check for common issues in workflow definitions (e.g., missing timeouts, unbounded retries, orphaned outputs, secret usage, policy label absence).

### Proposed Approach

Implement a set of static analysis rules that scan workflow definitions for predefined anti-patterns and best practice violations, providing warnings or errors.

### Tasks

- [ ] Define linting rules for workflow definitions.
- [ ] Implement linter engine.
- [ ] Integrate linters into workflow validation process.

### Acceptance Criteria

- Given a workflow definition, when linted, then all specified issues (missing timeouts, unbounded retries, etc.) are correctly identified and reported.
- Metrics/SLO: Linter execution p95 latency < 100ms.
- Tests: Unit tests for linter rules, integration tests for linter execution.
- Observability: Logs for linting results.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Author JSON Schema for WorkflowDefinition

### DOR / DOD

- DOR: Workflow linter design approved.
- DOD: Linters implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md

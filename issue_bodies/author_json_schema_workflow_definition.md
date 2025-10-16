### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.3 DSL & Validation
Excerpt/why: "Author a **JSON Schema** for `WorkflowDefinition` (steps: `task|condition|loop|human|subprocess|delay`; triggers: `event|webhook|schedule`)."

### Problem / Goal

Define a comprehensive JSON Schema for `WorkflowDefinition`, including supported step types and triggers.

### Proposed Approach

Create a JSON Schema document that formally specifies the structure, types, and constraints for workflow definitions, covering all allowed step types and triggers.

### Tasks

- [ ] Define schema for workflow steps.
- [ ] Define schema for workflow triggers.
- [ ] Consolidate into a complete `WorkflowDefinition` JSON Schema.

### Acceptance Criteria

- Given a workflow definition, when validated against the JSON Schema, then it correctly identifies valid and invalid definitions.
- Metrics/SLO: JSON Schema validation p95 latency < 50ms.
- Tests: Unit tests for schema validation.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: JSON Schema for WorkflowDefinition design approved.
- DOD: Schema implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md

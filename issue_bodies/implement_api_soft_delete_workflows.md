### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Workflow CRUD
Excerpt/why: "DELETE /api/workflows/:id — soft delete (policy‑gated)."

### Problem / Goal

Develop an API endpoint (`DELETE /api/workflows/:id`) for soft deleting workflows, ensuring it's policy-gated.

### Proposed Approach

Implement a REST API endpoint that marks a workflow as deleted (soft delete) rather than physically removing it, and integrates with the policy engine to ensure deletion is authorized.

### Tasks

- [ ] Define API endpoint for soft deleting workflows.
- [ ] Implement soft delete logic (marking as deleted).
- [ ] Integrate policy gating for delete operations.

### Acceptance Criteria

- Given a valid workflow ID and authorized request, when `DELETE /api/workflows/:id` is called, then the workflow is soft deleted and its status reflects deletion, respecting policy.
- Metrics/SLO: Workflow soft delete p95 latency < 100ms.
- Tests: Unit tests for soft delete logic and policy gating, integration tests for API endpoint.
- Observability: Logs for workflow soft delete events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: Workflow deletion policies.
- Compliance: Ensures controlled and auditable deletion of workflows.

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service, [policy] Enforce ABAC/OPA policies for workflow CRUD operations

### DOR / DOD

- DOR: Workflow soft delete API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md

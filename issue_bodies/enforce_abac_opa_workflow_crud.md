### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star - Success at Sprint End
Excerpt/why: "Policies (ABAC/OPA) are enforced for CRUD and execution."

### Problem / Goal

Apply ABAC/OPA policies to `create`, `read`, `update`, and `delete` workflow operations.

### Proposed Approach

Integrate OPA policy checks into the API endpoints responsible for workflow CRUD operations, ensuring that only authorized users can perform these actions based on their attributes and resource policies.

### Tasks

- [ ] Identify CRUD API endpoints for workflows.
- [ ] Implement OPA policy checks for each CRUD operation.
- [ ] Define ABAC policies for workflow CRUD.

### Acceptance Criteria

- Given a user attempts a CRUD operation on a workflow, when policies are enforced, then access is correctly granted or denied based on ABAC rules.
- Metrics/SLO: Policy checks add minimal overhead to CRUD operations.
- Tests: Unit tests for policy enforcement, integration tests for API access control.
- Observability: Logs for policy decisions.

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: ABAC policies for workflow CRUD.
- Compliance: Ensures secure and compliant management of workflows.

### Dependencies

Blocks: None
Depends on: [policy] Implement ABAC/OPA policies for policy-gateway

### DOR / DOD

- DOR: Workflow CRUD policy enforcement design approved.
- DOD: Policies implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md

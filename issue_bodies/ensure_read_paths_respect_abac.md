### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - Graph / DB
Excerpt/why: "read‑paths respect ABAC"

### Problem / Goal

Configure read operations to strictly adhere to Attribute-Based Access Control (ABAC) policies.

### Proposed Approach

Integrate the ABAC policy engine into all data read pathways (e.g., GraphQL resolvers, direct database queries) to filter or redact data based on user attributes and resource policies.

### Tasks

- [ ] Identify all read-paths in the system.
- [ ] Implement ABAC policy evaluation for read operations.
- [ ] Ensure data filtering/redaction based on policy.

### Acceptance Criteria

- Given a user attempts to read data, when ABAC policies are applied, then only data permissible by their attributes and resource policies is returned.
- Metrics/SLO: ABAC enforcement adds no more than 10% overhead to read latency.
- Tests: Unit tests for read-path ABAC enforcement, E2E test for correct data access based on roles.
- Observability: Logs for ABAC decisions on read operations.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: All relevant ABAC policies.
- Compliance: Ensures secure and compliant data access, preventing unauthorized disclosure.

### Dependencies

Blocks: None
Depends on: [policy] Implement ABAC/OPA policies for policy-gateway

### DOR / DOD

- DOR: Read-path ABAC enforcement design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

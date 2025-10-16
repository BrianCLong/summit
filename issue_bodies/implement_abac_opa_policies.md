### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Policy Reasoner & Audit v0.7
Excerpt/why: "ABAC/OPA policies"

### Problem / Goal

Define and enforce Attribute-Based Access Control (ABAC) policies using OPA for entities and edges.

### Proposed Approach

Develop Rego policies for OPA that define access rules based on attributes of users, resources, and environment, and integrate OPA into the GraphQL gateway.

### Tasks

- [ ] Define initial ABAC policies in Rego.
- [ ] Integrate OPA into the GraphQL gateway.
- [ ] Implement policy enforcement for read/write operations.

### Acceptance Criteria

- Given a user attempts an action, when ABAC/OPA policies are applied, then access is correctly granted or denied based on defined rules.
- Metrics/SLO: Policy decision latency p95 < 50ms.
- Tests: Unit tests for Rego policies, E2E test for policy enforcement.
- Observability: Logs for policy decisions.

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: All relevant ABAC policies.
- Compliance: Ensures secure and compliant data access.

### Dependencies

Blocks: None
Depends on: [policy] Deploy and configure OPA sidecar/library with hot-reload

### DOR / DOD

- DOR: ABAC/OPA policy design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Code: `policy-gateway` (GraphQL/OPA)
- Docs: SPRINT_PROVENANCE_FIRST.md

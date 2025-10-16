### Context

Source: SPRINT_PROVENANCE_FIRST.md - 10) Risks & Mitigations
Excerpt/why: "Policy sprawl: start with 5 canonical rules; add only with test."

### Problem / Goal

Establish a foundational set of 5 canonical OPA rules to guide policy development and prevent sprawl.

### Proposed Approach

Identify the most critical access control and governance requirements and translate them into a concise set of 5 OPA (Rego) policies.

### Tasks

- [ ] Identify 5 critical policy requirements.
- [ ] Write Rego code for the 5 canonical rules.
- [ ] Document the canonical rules and their purpose.

### Acceptance Criteria

- Given the policy requirements, when the 5 canonical OPA rules are reviewed, then they accurately reflect the core requirements and are well-defined.
- Metrics/SLO: N/A
- Tests: Unit tests for the 5 canonical rules.
- Observability: N/A

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: The 5 canonical rules.
- Compliance: Provides a strong foundation for policy enforcement and compliance.

### Dependencies

Blocks: None
Depends on: [policy] Implement ABAC/OPA policies for policy-gateway

### DOR / DOD

- DOR: Canonical OPA rules definition approved.
- DOD: Rules implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

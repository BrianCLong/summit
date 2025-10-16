### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Policy Reasoner & Audit v0.7
Excerpt/why: "block pages show human‑readable justification + appeal path"

### Problem / Goal

Render clear block pages with human-readable justification and a link to an appeal path when actions are denied by policy.

### Proposed Approach

Develop a standardized block page component that receives justification and appeal path information from the policy engine and displays it to the user.

### Tasks

- [ ] Design block page UI.
- [ ] Implement block page rendering logic.
- [ ] Integrate with policy denial responses to display relevant information.

### Acceptance Criteria

- Given a user attempts a blocked action, when the action is denied, then a block page is displayed with clear justification and an appeal path link.
- Metrics/SLO: Policy block pages return sub-150ms.
- Tests: Unit tests for block page rendering, E2E test for correct display on denial.
- Observability: Logs for policy denial events.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A
- Compliance: Provides transparency and recourse for denied actions.

### Dependencies

Blocks: None
Depends on: [policy] Implement ABAC/OPA policies for policy-gateway

### DOR / DOD

- DOR: Block page design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

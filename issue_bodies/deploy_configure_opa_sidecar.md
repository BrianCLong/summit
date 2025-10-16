### Context

Source: SPRINT_PROVENANCE_FIRST.md - 11) Dependencies
Excerpt/why: "OPA sidecar or library with hot‑reload bundle."

### Problem / Goal

Set up OPA as a sidecar or library with hot-reload capabilities for policy enforcement.

### Proposed Approach

Deploy OPA alongside relevant services (e.g., GraphQL gateway) as a sidecar container or integrate it as a library, configuring it to hot-reload policy bundles from a central source.

### Tasks

- [ ] Select OPA deployment model (sidecar/library).
- [ ] Configure OPA for hot-reload of policy bundles.
- [ ] Deploy OPA instance(s).

### Acceptance Criteria

- Given a new policy bundle is deployed, when OPA is running, then policies are hot-reloaded and enforced without service interruption.
- Metrics/SLO: Policy hot-reload completes within 5 seconds.
- Tests: E2E test for hot-reload functionality.
- Observability: Logs for OPA status and policy updates.

### Safety & Policy

- Action class: DEPLOY
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: OPA deployment strategy approved.
- DOD: OPA deployed, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 4) Dependencies
Excerpt/why: "OPA & policy bundles"

### Problem / Goal

Verify and configure OPA and its policy bundles are accessible for Maestro Composer.

### Proposed Approach

Ensure that OPA instances are deployed and configured to load the correct policy bundles, and that the Maestro Composer backend can communicate with OPA for policy decisions.

### Tasks

- [ ] Verify OPA instance provisioning.
- [ ] Configure OPA to load policy bundles.
- [ ] Configure Maestro Composer to connect to OPA.

### Acceptance Criteria

- Given the Maestro Composer backend is running, when policy decisions are required, then OPA is reachable and returns correct policy verdicts.
- Metrics/SLO: OPA policy decision p95 latency < 50ms.
- Tests: Integration tests for OPA connectivity and policy evaluation.
- Observability: Logs for OPA connection status and policy updates.

### Safety & Policy

- Action class: DEPLOY
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [policy] Deploy and configure OPA sidecar/library with hot-reload

### DOR / DOD

- DOR: OPA and policy bundle accessibility plan approved.
- DOD: OPA configured, connectivity verified, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md

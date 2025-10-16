### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 4) Dependencies
Excerpt/why: "`prov-ledger` API reachable."

### Problem / Goal

Verify and configure connectivity to the `prov-ledger` API for Maestro Composer.

### Proposed Approach

Ensure that the `prov-ledger` service is deployed and accessible from the Maestro Composer backend, and that the backend is correctly configured with the `prov-ledger` API endpoint.

### Tasks

- [ ] Verify `prov-ledger` service deployment.
- [ ] Configure `prov-ledger` API endpoint in Maestro Composer.
- [ ] Implement connectivity health checks.

### Acceptance Criteria

- Given the Maestro Composer backend is running, when it attempts to interact with `prov-ledger`, then the `prov-ledger` API is reachable and responds correctly.
- Metrics/SLO: `prov-ledger` API call p95 latency < 100ms.
- Tests: Integration tests for `prov-ledger` connectivity.
- Observability: Logs for `prov-ledger` API calls.

### Safety & Policy

- Action class: DEPLOY
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Implement evidence registration in prov-ledger service

### DOR / DOD

- DOR: `prov-ledger` API connectivity plan approved.
- DOD: Connectivity verified, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md

### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - Frontend / Apps
Excerpt/why: "Provenance HUD: manifest download"

### Problem / Goal

Allow users to download the manifest directly from the Provenance HUD.

### Proposed Approach

Add a download button or link within the Provenance HUD that triggers the manifest export API and initiates a file download.

### Tasks

- [ ] Design manifest download UI element.
- [ ] Implement frontend download logic.
- [ ] Integrate with manifest export API.

### Acceptance Criteria

- Given a user is viewing the Provenance HUD, when they click the download button, then the manifest.json file is downloaded.
- Metrics/SLO: Manifest download initiates within 100ms of click.
- Tests: Unit tests for download trigger, E2E test for successful download.
- Observability: Logs for manifest download requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Implement export manifest generation in prov-ledger service, [frontend] Implement Provenance HUD with per-node/edge tooltip

### DOR / DOD

- DOR: Manifest download design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

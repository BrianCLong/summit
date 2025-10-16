### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - UI Shell: Tri‑Pane
Excerpt/why: "Graph + Timeline + Map shells"

### Problem / Goal

Develop the map visualization component within the Tri-Pane UI shell.

### Proposed Approach

Implement a React component for map rendering, integrating with a mapping library (e.g., Leaflet, Mapbox) to display geographical data.

### Tasks

- [ ] Select map visualization library.
- [ ] Implement basic map rendering.
- [ ] Integrate with data fetching for geographical entities.

### Acceptance Criteria

- Given geographical data, when the Tri-Pane UI is loaded, then the Map shell displays entities on the map correctly.
- Metrics/SLO: Map rendering p95 latency < 500ms for 100 geographical points.
- Tests: Unit tests for map component, E2E test for map display.
- Observability: Logs for map rendering performance.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Map shell design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

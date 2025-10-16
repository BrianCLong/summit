### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - Frontend / Apps
Excerpt/why: "Provenance HUD: per‑node/edge provenance tooltip"

### Problem / Goal

Display provenance information as a tooltip on graph nodes and edges in the Provenance HUD.

### Proposed Approach

Integrate a tooltip component with the graph visualization to show detailed provenance data when a user hovers over a node or edge.

### Tasks

- [ ] Define provenance data to display in tooltip.
- [ ] Implement tooltip component.
- [ ] Wire tooltip to graph nodes/edges.

### Acceptance Criteria

- Given a user hovers over a graph node/edge, when the hover occurs, then a tooltip displaying its provenance information is visible.
- Metrics/SLO: Tooltip display p95 latency < 100ms.
- Tests: Unit tests for tooltip content, E2E test for tooltip display.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [frontend] Implement Graph shell in Tri-Pane UI

### DOR / DOD

- DOR: Provenance HUD tooltip design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

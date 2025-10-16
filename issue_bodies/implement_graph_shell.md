### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - UI Shell: Tri‑Pane
Excerpt/why: "Graph + Timeline + Map shells"

### Problem / Goal

Develop the graph visualization component within the Tri-Pane UI shell.

### Proposed Approach

Implement a React component for graph rendering, integrating with a graph visualization library (e.g., vis.js, D3.js) to display nodes and edges.

### Tasks

- [ ] Select graph visualization library.
- [ ] Implement basic graph rendering.
- [ ] Integrate with data fetching for graph entities.

### Acceptance Criteria

- Given graph data, when the Tri-Pane UI is loaded, then the Graph shell displays the nodes and edges correctly.
- Metrics/SLO: Graph rendering p95 latency < 500ms for 100 nodes/edges.
- Tests: Unit tests for graph component, E2E test for graph display.
- Observability: Logs for graph rendering performance.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Graph shell design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

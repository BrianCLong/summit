### Context

Source: SPRINT_PROVENANCE_FIRST.md - 12) Stretch
Excerpt/why: "Map corridor overlay + stay‑point detection on sample geo data."

### Problem / Goal

Add map overlays for corridors and implement stay-point detection on geographical data (Stretch Goal).

### Proposed Approach

Integrate with the map visualization component to draw geographical corridors and develop an algorithm to detect and highlight stay-points from geo-temporal data.

### Tasks

- [ ] Implement map corridor overlay rendering.
- [ ] Develop stay-point detection algorithm.
- [ ] Integrate detection results with map/timeline.

### Acceptance Criteria

- Given geo-temporal data, when displayed on the map, then corridors are overlaid, and stay-points are detected and highlighted.
- Metrics/SLO: Corridor overlay rendering p95 latency < 300ms; stay-point detection p95 latency < 1 second for 1000 points.
- Tests: Unit tests for detection algorithm, E2E test for map overlay display.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [frontend] Implement Map shell in Tri-Pane UI

### DOR / DOD

- DOR: Map overlay and stay-point detection design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

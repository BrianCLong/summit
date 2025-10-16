### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - UI Shell: Tri‑Pane
Excerpt/why: "dark/light"

### Problem / Goal

Provide a toggle for dark and light themes in the Tri-Pane UI.

### Proposed Approach

Implement a theme switcher that applies CSS variables or classes to change the visual theme of the application.

### Tasks

- [ ] Define dark/light theme CSS variables/classes.
- [ ] Implement theme toggle UI component.
- [ ] Integrate theme switching logic across the application.

### Acceptance Criteria

- Given a user clicks the theme toggle, when the theme changes, then the Tri-Pane UI visually updates to the selected dark or light mode.
- Metrics/SLO: Theme switch occurs instantly (< 50ms).
- Tests: Unit tests for theme logic, E2E test for theme switching.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Dark/light mode design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

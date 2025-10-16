### Context

Source: SPRINT_PROVENANCE_FIRST.md - 7) Test Plan - E2E
Excerpt/why: "screenshot diffs for UI"

### Problem / Goal

Integrate screenshot comparison into UI E2E tests for visual regression, ensuring UI consistency.

### Proposed Approach

Utilize a visual regression testing tool (e.g., Playwright's built-in screenshot comparison, Storybook's Chromatic) to capture screenshots during E2E tests and compare them against baselines.

### Tasks

- [ ] Select visual regression tool.
- [ ] Implement screenshot capture in E2E tests.
- [ ] Configure baseline management and diffing.

### Acceptance Criteria

- Given a UI change, when E2E tests run, then screenshot diffs are generated, highlighting visual regressions for review.
- Metrics/SLO: Screenshot comparison adds no more than 10% overhead to E2E test runtime.
- Tests: Visual regression tests pass.
- Observability: Visual regression reports are accessible.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [ci-cd] Develop E2E test for ingest → provenance → NL query → disclosure flow

### DOR / DOD

- DOR: Screenshot diffs strategy approved.
- DOD: Tool integrated, tests implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md

# Web Package Testing Plan

This package follows a balanced testing pyramid to keep the IntelGraph web experience reliable and responsive.

## Coverage Targets

- **Unit (≈70%)**: Component logic (render guards, toggles, helpers) with Vitest + jsdom.
- **Integration/API (≈20%)**: Cross-component flows that combine graph rendering with provenance overlays.
- **E2E (≈10%)**: Navigation, investigation creation, and export paths via Playwright/Cypress.

## Representative E2E Workflow

Use this scenario as a baseline check for regressions:

1. Open `/investigations/new` and create an investigation named **"Test Investigation"**.
2. Add an entity via `[data-testid="add-entity"]`, fill `[name="entity-name"]` with **"John Doe"**.
3. Run analysis with `[data-testid="run-analysis"]` and wait for `[data-testid="results"]`.
4. Export the report via `[data-testid="export-pdf"]` and assert `[data-testid="export-success"]` is visible.

## Quality Gates

- Run `npm test` in this package before committing.
- Prefer data-testid hooks for graph controls (progressive disclosure, compact guards) to stabilize tests.
- Add coverage for new UX affordances (tooltips, responsive toggles) alongside implementation changes.

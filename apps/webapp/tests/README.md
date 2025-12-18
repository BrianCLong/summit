# Webapp E2E and Visual Suite

This suite covers critical tri-pane flows with Playwright and Cypress.

## Playwright
- Config: `apps/webapp/playwright.config.ts`
- Commands: `pnpm --filter webapp exec playwright test` (all), `pnpm --filter webapp exec playwright test --project=visual` (snapshots)
- Test data: deterministic graph fixtures via `tests/utils/generateGraph.ts`
- Harness: `tests/utils/harness.ts` seeds the browser with map stubs and graph data for predictable runs.

## Cypress
- Config: `apps/webapp/cypress.config.ts`
- Commands: `pnpm --filter webapp run test:cypress`
- Support bootstrap ensures the same harness is applied before visiting the app.

## Visual baselines
- Update snapshots with `pnpm --filter webapp exec playwright test --project=visual --update-snapshots`.

# Dashboard A/B Testing & Verification Guide

This guide explains how the Summit UI fetches experiment configurations, renders dashboard layout variants, and records telemetry for the "dashboard-layout" experiment. It also outlines how to test the workflow end-to-end.

## Feature Overview

- **Experiment delivery**: `ui_experiments` table in Postgres stores feature flags and variation metadata. The GraphQL API exposes them through the `uiExperiments` query.
- **React integration**: The dashboard page wraps the layout inside `react-ab-test` experiments and automatically defines variant weights from the backend response.
- **Telemetry**: When a variant renders or a tracked interaction occurs, the UI emits OpenTelemetry spans and mirrors them to `window.__otelExperimentEvents` for verification.

## Running the GraphQL Layer

1. Ensure the new migration has been applied: `npm run db:migrate` (from the repository root or inside `server/`).
2. The `uiExperiments` query accepts an optional list of `featureKeys`. Example request:

   ```graphql
   query UIExperiments {
     uiExperiments(featureKeys: ["dashboard-layout"]) {
       id
       featureKey
       variations {
         name
         weight
         config
       }
     }
   }
   ```

## Frontend Workflow

1. The dashboard page (`client/src/pages/Dashboard/index.tsx`) delegates rendering to `DashboardLayoutExperiment`.
2. The component fetches experiment metadata via Apollo, defines the variant weights with `react-ab-test`, and reads the stable user identifier from `localStorage`.
3. Variant exposures and interactions (for example, clicking **Open Grafana**) generate OTEL spans and append structured events to `window.__otelExperimentEvents` for observability-focused testing.

## Running UI Tests

Use Playwright to validate both variants and telemetry wiring:

```bash
cd client
pnpm exec playwright test tests/e2e/ui/dashboard-experiments.spec.ts
```

The test suite stubs the GraphQL response, seeds local storage with the desired variant (`PUSHTELL-dashboard-layout`), and asserts that:

- The expected headings for control vs. compact layouts are visible.
- `window.__otelExperimentEvents` contains exposure and interaction entries for the active variant.

## Manual Verification Tips

1. Open `/dashboard` in a dev build.
2. Run `localStorage.setItem('PUSHTELL-dashboard-layout', 'compact')` (or `control`) and refresh.
3. Inspect `window.__otelExperimentEvents` in DevTools to confirm exposure and interaction records update as you interact with the layout.

## Troubleshooting

- **No experiment data**: Verify the migration executed and that `ui_experiments` contains the expected row for your tenant.
- **Variant does not switch**: Clear local storage keys `PUSHTELL-dashboard-layout` and `ui-experiments:user-id` before reloading.
- **Telemetry missing**: Confirm the OTEL web tracer is initialised (`client/src/maestro/otel/web.ts`) and check the console for warnings emitted by the instrumentation hooks.

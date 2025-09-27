# Outcome-Safe Rollout Planner Dashboard

A lightweight TypeScript dashboard toolkit that visualises OSRP rollout manifests, highlights guardrail performance, and surfaces auto-revert triggers.

## Usage

```bash
cd web/osrp-dashboard
npm install
npm run dev fixtures/rollout_success_manifest.json
```

The `dev` script renders a textual summary of the supplied manifest and prints stage-level guardrail outcomes.

## Structure

- `src/manifest.ts` — Typed manifest schema shared by the dashboard modules.
- `src/view-model.ts` — Aggregates guardrails into UI ready view models.
- `src/index.ts` — CLI entry point for quick manifest inspection.
- `test/dashboard.test.ts` — Guards regression on guardrail visualisation logic using Vitest.

Fixtures under `fixtures/` were generated directly from the Go planner to keep parity between controller and dashboard expectations.

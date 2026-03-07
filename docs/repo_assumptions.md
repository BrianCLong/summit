# Repository Assumptions & Validations

## Verified
- **Host shell path**: The frontend app seems to be located at `client/` (not `apps/web/`). There is a `client` workspace in `package.json`.
- **Backend path**: `server/`.
- **Frontend framework**: React (inferred from `package.json` devDependencies like `eslint-plugin-react`).
- **Test runner**: `jest` and `vitest` are present in `package.json`. Playwright is used for E2E tests (`@playwright/test`).
- **Artifact directory conventions**: `artifacts/` or `dist/evidence/` based on `ci:soc-report` script in `package.json`.
- **Evidence schema location**: Not entirely found yet, but we will use the `APS-<slug>-<nnn>` pattern as specified.
- **Must-not-touch files**: Existing `.github/workflows/*security*`, existing DB migrations, auth middlewares.
- **Package structure**: It's a `pnpm` workspace with `packages/*`, `client`, and `server`.

## Assumed (To be mapped or created)
- `packages/surfaces/` for generated dashboard surfaces
- `packages/design-ingestion/` for Figma MCP normalization
- `packages/graphrag-ui/` for graph → UI planning
- `scripts/surfaces/` for deterministic generation / drift / deploy tasks
- Telemetry event sink: Needs to be implemented or hooked into an existing logging sink.
- GraphRAG read APIs: We assume we'll use a `GraphSnapshot` mock or interface until we integrate with the actual backend.

We will proceed with creating the skeletons under `packages/graphrag-ui/`, `packages/surfaces/`, `packages/ui-refactor-agent/`, `scripts/surfaces/`, etc., as per the plan. For the host shell, we will target `client/src/` instead of `apps/web/src/`.

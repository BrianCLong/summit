# Repo Assumptions & Verifications

## Verified
1.  **Package Location**: `packages/` is the standard location for modules.
2.  **Package Scope**: `@intelgraph` is the naming convention (e.g., `@intelgraph/disinformation-detection`).
3.  **Validation Library**: `ajv` is present in root `devDependencies`.
4.  **Testing**: `vitest` and `jest` are available. I will use `vitest` as it seems to be the modern standard in this repo (found in `scripts/` and root `package.json`).
5.  **Workspace**: `pnpm` workspaces are used.

## Assumptions
1.  **New Package**: `packages/disinfo-ops` is a new package and does not conflict with existing work (verified by absence).
2.  **Schema Standard**: We are defining new schemas for "Ops-first" pipeline, but loosely aligning with `evidence/*.schema.json` conventions (e.g., separating report, metrics, stamp).

## Must-not-touch
*   `docs/ci/REQUIRED_CHECKS_POLICY.yml`
*   Security scanning workflows (unless required).

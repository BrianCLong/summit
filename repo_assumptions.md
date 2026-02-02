# Repo Assumptions & Verification

## Verified Paths
- **Server Entry Point**: `server/src/app.ts` (Express app configuration)
- **Feature Flags**: `feature-flags/flags.yaml`
- **Root Schemas**: `schemas/`
- **Fixtures**: `fixtures/`
- **Scripts**: `scripts/` (executed via `pnpm` in root or `server/`)

## Assumptions
- **FactFlow Location**: `server/src/factflow/` is used to contain the new module, keeping it close to the server logic but distinct.
- **Schema Location**: `server/src/factflow/schema/` is used for module-specific schemas to avoid polluting the root `schemas/` directory initially.
- **Evidence IDs**: New `EVD-` IDs will be generated using a SHA256 deterministic hash.

## "Must-Not-Touch" List
- `docs/ci/REQUIRED_CHECKS_POLICY.yml` (and anything that syncs it)
- Existing security workflows
- `server/src/middleware/auth.ts` (unless absolutely necessary, use existing auth)

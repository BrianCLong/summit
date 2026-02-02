# Repo Assumptions & Reality Check

## Verified Paths & Conventions
- **Monorepo**: Uses `pnpm` workspaces defined in `pnpm-workspace.yaml`.
- **Packages**: Located in `packages/`. `maestro-core` serves as a reference for package structure.
- **Evidence Schemas**:
  - Root `schemas/` contains core evidence schemas (`evidence.report.schema.json`, etc.).
  - `evidence/schemas/` contains domain-specific/legacy schemas.
  - New schemas for `factcert` will be placed in `packages/factcert/schema/`.
- **CI Workflows**:
  - `ci.yml`, `ci-pr.yml` are main entry points.
  - `security-tests.yml`, `compliance.yml` handle specific gates.
- **TypeScript**: `tsconfig.json` extends `tsconfig.base.json`.

## Must-Not-Touch (Until Validated)
- `policies/*`: Governance policies.
- `security/*`: Security configurations.
- `.github/workflows/*`: CI definitions (unless adding new specific job).
- `evidence/index.json`: Master evidence index (automated).

## Validation Commands
- Build: `pnpm build`
- Test: `pnpm test`
- Verify Schema: `npx ajv validate -s <schema> -d <data>`
- Run Scripts: `npx tsx scripts/...`

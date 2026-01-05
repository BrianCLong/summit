# GA Evidence Index

Centralized index of commands, outputs, and artifact locations for GA verification.

## Test & Lint Commands

| Command                    | Status  | Evidence                                      | Notes                            |
| -------------------------- | ------- | --------------------------------------------- | -------------------------------- |
| `npm run test:quick`       | ✅      | Output recorded in terminal (sanity check)    | Confirms node toolchain executes |
| `npm run lint:strict`      | Pending | To be executed; attach ESLint/Ruff logs       | Required before GA sign-off      |
| `npm run typecheck`        | Pending | To be executed; attach `tsc` output           | Must be clean                    |
| `npm run test:unit`        | Pending | To be executed; attach Jest report            |                                  |
| `npm run test:integration` | Pending | To be executed; attach integration logs       |                                  |
| `npm run test:e2e`         | Pending | To be executed; attach Playwright report      |                                  |
| `make ci`                  | Pending | Mirror CI entrypoint; attach consolidated log | Run after individual steps       |

## Security & Compliance

| Command                           | Status  | Evidence | Notes                          |
| --------------------------------- | ------- | -------- | ------------------------------ |
| `npm run security:check`          | Pending |          | SAST/SCA baseline              |
| `npm run generate:sbom`           | Pending |          | Store `sbom.json` in repo root |
| `npm run verify:governance`       | Pending |          | Governance policy checks       |
| `npm run verify:living-documents` | Pending |          | Ensures docs not stale         |

## Operations & Runtime

| Command                                 | Status  | Evidence | Notes                                              |
| --------------------------------------- | ------- | -------- | -------------------------------------------------- | ----------------------- |
| `make dev-up`                           | Pending |          | Bring up stack for smoke                           |
| `make dev-smoke`                        | Pending |          | Capture curl outputs and screenshots if applicable |
| `make smoke`                            | Pending |          | Golden path smoke for fresh clone                  |
| `make rollback v=<version> env=<staging | prod>`  | Pending  |                                                    | Record rollback dry-run |

## Build & Artifacts

| Command                       | Status  | Evidence | Notes                                           |
| ----------------------------- | ------- | -------- | ----------------------------------------------- |
| `npm run build`               | Pending |          | Client + server builds                          |
| `make release`                | Pending |          | Docker + wheel artifacts with IMAGE_TAG aligned |
| `npm run generate:provenance` | Pending |          | Capture provenance if enabled                   |

## Evidence Storage Locations

- **Logs**: Attach stdout/stderr snippets to this file or link to CI artifacts.
- **SBOM**: `sbom.json` in repo root.
- **Provenance**: `artifacts/provenance/` (if generated).
- **Screenshots/Reports**: Store under `artifacts/evidence/` with date-stamped subfolders.

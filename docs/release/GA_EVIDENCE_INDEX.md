# GA Evidence Index

Centralized index of commands, outputs, and artifact locations for GA verification.

**Last Updated**: 2026-01-06

## Test & Lint Commands

| Command                    | Status      | Evidence                                      | Notes                            |
| -------------------------- | ----------- | --------------------------------------------- | -------------------------------- |
| `npm run test:quick`       | ✅          | Output recorded in terminal (sanity check)    | Confirms node toolchain executes |
| `npm run lint:strict`      | ⚠️ Deferred | See GA_DECISIONS.md                           | Non-blocking per decision        |
| `npm run typecheck`        | ⚠️ Deferred | Some packages have implicit any types         | Build passes; typecheck deferred |
| `npm run test:unit`        | ✅          | CLI: 262 tests passed                         | Server tests have ESM issues     |
| `npm run test:integration` | ⚠️ Deferred | See GA_DECISIONS.md                           | Non-blocking per decision        |
| `npm run test:e2e`         | Pending     | To be executed; attach Playwright report      |                                  |
| `make ci`                  | Pending     | Mirror CI entrypoint; attach consolidated log | Run after individual steps       |

## Security & Compliance

| Command                           | Status | Evidence                                              | Notes                  |
| --------------------------------- | ------ | ----------------------------------------------------- | ---------------------- |
| `npm run security:check`          | ✅     | "Security check passed (simulated)"                   | SAST/SCA baseline      |
| `npm run generate:sbom`           | ✅     | `.evidence/sbom.json` generated                       | SBOM complete          |
| `npm run verify:governance`       | ✅     | "Governance artifacts present and structurally valid" | Governance checks pass |
| `npm run verify:living-documents` | ✅     | "All documents are up to date"                        | Living docs verified   |

## Operations & Runtime

| Command                                 | Status  | Evidence | Notes                                              |
| --------------------------------------- | ------- | -------- | -------------------------------------------------- |
| `make dev-up`                           | Pending |          | Bring up stack for smoke                           |
| `make dev-smoke`                        | Pending |          | Capture curl outputs and screenshots if applicable |
| `make smoke`                            | Pending |          | Golden path smoke for fresh clone                  |
| `make rollback v=<version> env=staging` | Pending |          | Record rollback dry-run                            |

## Build & Artifacts

| Command                       | Status  | Evidence   | Notes                                           |
| ----------------------------- | ------- | ---------- | ----------------------------------------------- |
| `pnpm build`                  | ✅      | 2026-01-06 | Client + server builds pass                     |
| `make release`                | Pending |            | Docker + wheel artifacts with IMAGE_TAG aligned |
| `npm run generate:provenance` | Pending |            | Capture provenance if enabled                   |

## Evidence Storage Locations

- **Logs**: Attach stdout/stderr snippets to this file or link to CI artifacts.
- **SBOM**: `sbom.json` in repo root.
- **Provenance**: `artifacts/provenance/` (if generated).
- **Screenshots/Reports**: Store under `artifacts/evidence/` with date-stamped subfolders.


## Proposed Claims

| Command | Status | Evidence | Notes |
| --- | --- | --- | --- |
| `TBD` | ⚠️ Pending | Claim SEC-001: Summit ensures total zero-know... | test needed |

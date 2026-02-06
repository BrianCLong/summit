# Repository Assumptions for Adaptive Tradecraft Graph (ATG)

## Directory Structure
- **Root-level Python:** The `summit/` directory contains the Python package code.
- **Root-level TypeScript:** The `src/` directory contains TypeScript source code.
- **Tests:** The `tests/` directory contains both Python and TypeScript tests.
- **Documentation:** The `docs/` directory contains documentation.

## Module Location
- **ATG Module:** We assume that `src/graphrag/atg` is the appropriate location for the new "Adaptive Tradecraft Graph" module, implemented in TypeScript.
- **Connectors:** While `connectors/` exists in the root (Python), any new TypeScript-based connectors for ATG will be placed in `src/connectors` (to be created if needed) or integrated into `src/graphrag/atg` ingest logic.

## Testing
- New tests for ATG will be placed in `tests/atg/` to mirror the module structure and leverage the existing test infrastructure (likely Jest).

## CI/CD
- We assume standard CI checks (lint, test) are triggered via GitHub Actions, and we will adhere to them by running `pnpm test` and ensuring code quality.

## Evidence Contract
- We adhere to the requirement of **no runtime timestamps** in evidence artifacts to ensure determinism.
- Evidence IDs will be SHA256 hashes of the content.

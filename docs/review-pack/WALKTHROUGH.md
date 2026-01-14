# Assessor Walkthrough

This document provides a step-by-step guide for external assessors to verify the integrity and reproducibility of the Summit platform's release artifacts.

## Phase A: Environment Setup

A clean environment is crucial for a reproducible dry-run. While a local machine can be used, the authoritative environment is a GitHub Actions runner, as defined in our CI workflows.

### Prerequisites

- **Node.js**: Version 20.11.0 or as specified in `.nvmrc`.
- **pnpm**: Version 9.x or as specified in `package.json`.
- **Docker**: Latest stable version.
- **make**: Standard build-essential.

### Environment Variables

For a controlled run, the following environment variables are recommended:

- `CI=1`: Simulates the CI environment, disabling interactive prompts and enabling CI-specific optimizations.
- `RUN_ACCEPTANCE=false`: Skips long-running acceptance tests that require extensive setup.
- `NO_NETWORK_LISTEN=true`: Prevents services from binding to network ports, which may be restricted in some environments.

## Phase B: Walkthrough Execution

The following commands should be executed from the root of the repository. All outputs should be captured to a log file for later review.

### 1. Test & Lint Commands

These commands verify the basic code quality and correctness.

| Command | Description |
|---|---|
| `npm run test:quick` | Runs a small, fast set of tests to confirm the test runner is configured correctly. |
| `npm run lint:strict` | Lints the codebase using the strictest configuration. Some warnings may be deferred. |
| `npm run typecheck` | Verifies TypeScript types. Some packages may have `implicit any` types and are deferred. |
| `npm run test:unit` | Runs unit tests for all packages. Note: Server tests may have known ESM-related issues. |
| `npm run test:integration` | Runs integration tests. Some may be deferred based on environment constraints. |
| `npm run test:e2e` | Runs end-to-end tests using Playwright. Requires a running application stack. |
| `make ci` | Runs the same set of checks as the Continuous Integration pipeline. |

### 2. Security & Compliance

These commands verify the security posture and compliance artifacts.

| Command | Description |
|---|---|
| `npm run security:check` | Runs a simulated security check to ensure SAST/SCA tools are configured. |
| `npm run generate:sbom` | Generates a Software Bill of Materials (SBOM) in CycloneDX format. |
| `npm run verify:governance` | Verifies that governance-as-code artifacts are present and structurally valid. |
| `npm run verify:living-documents` | Checks for drift between documentation and the codebase. |

### 3. Operations & Runtime

These commands verify the application's runtime behavior.

| Command | Description |
|---|---|
| `make dev-up` | Starts the full application stack using Docker Compose. |
| `make dev-smoke` | Runs smoke tests against the locally running application. |
| `make smoke` | Runs the "golden path" smoke test from a clean clone, ensuring a fresh install works as expected. |
| `make rollback v=<version> env=staging` | Performs a dry-run of a release rollback. |

### 4. Build & Artifacts

These commands verify the build process and the integrity of the generated artifacts.

| Command | Description |
|---|---|
| `pnpm build` | Builds all packages in the monorepo. |
| `make release` | Creates release artifacts, such as Docker images. |
| `npm run generate:provenance` | Generates SLSA provenance for the build. |

## Phase C: Bundle Generation

After running the walkthrough commands, generate the final bundle.

```bash
./scripts/release/build-ga-bundle.sh --tag v$(date +%Y.%m.%d)-dryrun --sha $(git rev-parse HEAD)
```

This command will create a GA bundle in the `artifacts/ga-bundles/` directory, containing all the necessary release artifacts, metadata, and checksums.

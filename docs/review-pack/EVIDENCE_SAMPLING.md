# Evidence Sampling (Fast Path)

This document provides a "fast path" for assessors to sample key evidence without executing the entire, time-consuming test suite. These steps are designed to be run in a constrained environment and complete within approximately 5 minutes.

The goal is to verify that the core application builds, starts, and passes its most critical health checks.

## 1. Quick Sanity Check

This command runs a series of fast, high-level checks to ensure the basic project configuration is sound.

**Command:**
```bash
pnpm test:quick
```

**Expected Output:**
The command should output `'Quick sanity check passed'` and exit with a code of `0`.

**Time Bound:** < 1 minute

## 2. Smoke Tests

The smoke tests validate the application's "golden path." They start the required backend services, seed a test dataset, and run a suite of automated checks against the live application to ensure core functionality is working as expected.

**Command:**
```bash
make smoke
```
*(Note: This command is defined in the root `Makefile` and orchestrates several `pnpm` scripts.)*

**Expected Output:**
The script will output logs from various services. A successful run is indicated by the final message "Smoke tests passed" and an exit code of `0`.

**Time Bound:** < 4 minutes

## 3. Key Artifact Verification

After running the steps above, you can sample the following key artifacts to verify the integrity of the codebase and its dependencies.

### Dependency Lockfile

- **Path:** `pnpm-lock.yaml`
- **Purpose:** This file provides a deterministic record of all project dependencies. Its presence and integrity are critical for reproducible builds. Verify that this file is present in the repository root.

### Build Manifests

- **Path:** `packages/*/dist/manifest.json` or `apps/*/build/manifest.json` (example paths)
- **Purpose:** After running a build (`pnpm build`), many packages produce a manifest file that details the generated assets. These can be used to verify that the build process completed successfully.

### Test Reports

- **Path:** `packages/*/reports/` or `apps/*/reports/`
- **Purpose:** Individual packages generate test reports, typically in JUnit XML format. For example, after running `pnpm test:server`, you can find the results at `server/reports/`. These reports provide granular evidence of test execution and pass/fail status.

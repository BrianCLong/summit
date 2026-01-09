# Evidence Sampling (Fast Path)

This document provides a "fast path" for assessors to quickly sample the evidence generated during the walkthrough. These commands are designed to be run in a constrained environment and should complete within 5 minutes.

The purpose of this fast path is to verify the integrity of the generated bundle and to quickly assess the overall health of the codebase without running the full, time-consuming test suite.

## 1. Verify Bundle Integrity

After generating the release bundle with `scripts/release/build-ga-bundle.sh`, navigate to the output directory (e.g., `artifacts/ga-bundles/v2024.01.01-dryrun`) and run the following command:

```bash
sha256sum -c SHA256SUMS
```

This command checks the SHA256 checksums of all files in the bundle against the `SHA256SUMS` manifest. A successful run will output `OK` for each file, confirming that the artifacts have not been tampered with.

## 2. Quick Code Quality & Security Checks

These commands provide a quick snapshot of the codebase's quality and security posture without the overhead of a full build or test run.

| Command | Description | Estimated Time |
|---|---|---|
| `npm run test:quick` | Confirms the test runner is configured correctly. | < 30 seconds |
| `npm run lint:strict` | Lints the codebase for style and consistency. | < 2 minutes |
| `npm run security:check` | Runs a simulated security check. | < 1 minute |
| `npm run generate:sbom` | Generates a Software Bill of Materials. | < 1 minute |

These commands should execute quickly and provide a baseline level of confidence in the codebase. Any failures in these commands would indicate a significant issue that should be investigated further.

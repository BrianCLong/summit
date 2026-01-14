# Reproducible Build Gate

**Type:** Integrity | **Blocking:** Yes

## Purpose
Ensures that the build process is deterministic and not influenced by the build environment.

## Mechanism
*   **Tool:** `scripts/check-reproducibility.sh`
*   **Trigger:** `repro-build-check` workflow.
*   **Check:** Builds the artifact twice in slightly different environments/paths and compares the binary/checksums.

## Failure Response
1.  **Investigate:** Check for timestamps, absolute paths, or non-deterministic file ordering in the build output.
2.  **Fix:** Modify build scripts to strip timestamps or sort file lists.

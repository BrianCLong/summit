# Supply Chain & Build Integrity Inventory

## Existing Artifacts

### Scripts
- **`scripts/generate-sbom.sh`**:
  - Generates SBOMs for npm, Python, and Java.
  - Uses `syft` and `cyclonedx-npm`.
  - Output formats: `cyclonedx-json`, `spdx-json` (via syft).
  - Logic to check for `package-lock.json`, `requirements.txt`, `pom.xml`.
  - Seems robust but disconnected from `ci-verify.yml`.

- **`scripts/sbom-attest.sh`**:
  - Builds Docker images for `intelgraph-server` and `intelgraph-web`.
  - Uses `syft` to generate SBOMs for the images.
  - Uses `cosign` to sign the images and attest the SBOMs.
  - Requires `COSIGN_PRIVATE_KEY` environment variable.

- **`scripts/sign-artifacts.sh`**:
  - Signs a container image and artifacts in `dist/`.
  - specific to `summit-platform` image name.
  - Uses `cosign` (key or keyless).

### CI Workflows
- **`.github/workflows/_reusable-slsa-build.yml`**:
  - A comprehensive reusable workflow for building and pushing Docker images.
  - Generates SLSA provenance using `slsa-framework/slsa-github-generator`.
  - Generates SBOMs using `syft`.
  - Signs images using `cosign` (keyless OIDC).
  - This appears to be the "Golden Path" implementation but is not used by the main verification workflow.

- **`.github/workflows/ci-verify.yml`**:
  - The primary gate for PRs.
  - Contains a `provenance` job that checks for `scripts/generate-sbom.sh` and `scripts/attest-slsa.sh`.
  - **CRITICAL GAP**: It executes `scripts/generate-sbom.sh` if it exists, but falls back to placeholders. It does *not* seem to use `scripts/sbom-attest.sh`.
  - It has a placeholder for `scripts/attest-slsa.sh` which generates a dummy `provenance.json`.

## Gaps & Disconnects
1.  **Fragmentation**: SBOM generation logic exists in multiple places (`generate-sbom.sh`, `sbom-attest.sh`, `_reusable-slsa-build.yml`).
2.  **Missing Link**: `ci-verify.yml` does not use the robust `_reusable-slsa-build.yml` or the `sbom-attest.sh` script effectively. It relies on `generate-sbom.sh` which handles source dependencies but not container images or SLSA provenance for the build artifacts.
3.  **Placeholder Reliance**: `ci-verify.yml` explicitly creates placeholder SBOM/Provenance if scripts fail or are missing, which might mask actual failures.
4.  **Signing**: `sign-artifacts.sh` is a standalone script not clearly invoked by `ci-verify.yml`.

## Recommendations
- **Consolidate**: Use `scripts/generate-sbom.sh` as the single source of truth for source-level SBOMs.
- **Integrate**: Make `ci-verify.yml` call `_reusable-slsa-build.yml` for container builds or integrate `sbom-attest.sh` logic.
- **Enforce**: Remove placeholders in `ci-verify.yml` and fail if SBOM/Provenance generation fails.

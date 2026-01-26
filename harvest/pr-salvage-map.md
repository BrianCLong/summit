# PR Salvage Map

## Salvageable Assets
- **`scripts/generate-sbom.sh`**:
    - **Status:** Functional, generates SBOMs.
    - **Salvage Action:** Use as the core for SBOM generation in CI.
    - **Enhancements Needed:** Ensure it covers all languages (js, py, java) consistently and outputs to a standard location (`dist/`).

- **`scripts/sbom-attest.sh`**:
    - **Status:** Functional for containers.
    - **Salvage Action:** Extract the signing/attestation logic into a reusable script or integrate directly into CI.
    - **Enhancements Needed:** Parametrize for flexibility (not hardcoded to `intelgraph-server`).

- **`scripts/sign-artifacts.sh`**:
    - **Status:** Functional for `dist/` artifacts.
    - **Salvage Action:** Integrate into the release process or `ci-verify.yml` post-build.

- **`_reusable-slsa-build.yml`**:
    - **Status:** Highly robust, reusable workflow.
    - **Salvage Action:** Make it the standard build workflow for all container images.
    - **Enhancements Needed:** Ensure it's called by `ci.yml` and `ci-verify.yml` (if applicable).

- **`ci-verify.yml`**:
    - **Status:** The main gate.
    - **Salvage Action:** Keep the structure but replace placeholders with real script calls.
    - **Enhancements Needed:** Remove `continue-on-error`, enforce script existence, verify generated artifacts.

## Dead Code / Cleanup Candidates
- **Placeholder logic in `ci-verify.yml`**: Specifically the `echo "Placeholder ..."` lines.
- **Redundant scripts**: If `generate-sbom.sh` covers `sbom-attest.sh`'s SBOM part, consolidate.
- **Unused workflows**: Any workflows not running or superseded by `_reusable-slsa-build.yml`.

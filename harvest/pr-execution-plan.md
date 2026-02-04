# PR Execution Plan

## Objective
Convert harvested supply chain signal into authoritative, enforced, and verifiable assets. Eliminate placeholders and consolidate logic.

## Execution Sequence

### PR 1: Canonicalize Supply Chain Scripts
**Goal:** Establish a single source of truth for SBOM generation and artifact signing.
- **Modify:** `scripts/generate-sbom.sh` to:
  - Output consistently to `dist/sbom/`.
  - Support all project languages (npm, python, java, go).
  - Generate both SPDX and CycloneDX formats.
- **Modify:** `scripts/sbom-attest.sh` to:
  - Accept artifact paths/images as arguments (not hardcoded).
  - Use `scripts/generate-sbom.sh` logic where applicable.
- **Delete:** Redundant or conflicting scripts (e.g., if `sign-artifacts.sh` is redundant with `sbom-attest.sh`).

### PR 2: Harden CI Verification (`ci-verify.yml`)
**Goal:** Enforce supply chain integrity in the main PR gate.
- **Modify:** `.github/workflows/ci-verify.yml`:
  - **Remove:** "Placeholder SBOM/Provenance" logic.
  - **Update:** `provenance` job to call `scripts/generate-sbom.sh` and `scripts/sbom-attest.sh`.
  - **Enforce:** Remove `continue-on-error: true` from critical supply chain steps.
  - **Verify:** Ensure `dist/` artifacts are preserved for evidence generation.

### PR 3: Operationalize Governance Evidence
**Goal:** Ensure governance checks are real and blocking.
- **Modify:** `.github/workflows/ci-verify.yml` -> `ga-evidence-completeness`:
  - **Fail:** If `dist/evidence/` contains only stubs or is missing.
  - **Update:** `scripts/evidence/` scripts to validate against real policies in `governance/`.

### PR 4: Adopt Golden Path for Containers
**Goal:** Use the robust `_reusable-slsa-build.yml` for all container builds.
- **Modify:** `ci.yml` (or equivalent build workflow):
  - **Call:** `.github/workflows/_reusable-slsa-build.yml` for building and pushing images.
  - **Verify:** Ensure SLSA provenance and SBOMs are generated and signed.

## Success Metrics
- **Deterministic Builds:** All builds produce signed SBOMs and Provenance.
- **No Placeholders:** CI fails if artifacts cannot be generated.
- **Audit Trail:** Evidence bundles in `dist/evidence/` are complete and verifiable.

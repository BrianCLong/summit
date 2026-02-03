# CI/CD Gap Analysis

## Overview
This document analyzes the gap between current CI verification (`ci-verify.yml`) and the expected robust supply chain integrity practices (demonstrated in `_reusable-slsa-build.yml` and governance mandates).

## `ci-verify.yml` vs. Standard

| Feature | `ci-verify.yml` (Current Gate) | `_reusable-slsa-build.yml` (Golden Path) | Gap / Issue |
| :--- | :--- | :--- | :--- |
| **SBOM Generation** | Checks for `scripts/generate-sbom.sh`. Creates placeholder if missing/failing. | Generates SPDX & CycloneDX using `syft` on the image/context. | `ci-verify.yml` uses placeholders and fails open (continues on error). It checks `scripts/generate-sbom.sh` which exists but is not integrated with the build artifacts properly. |
| **SLSA Provenance** | Checks for `scripts/attest-slsa.sh`. Creates placeholder if missing. | Uses `slsa-framework/slsa-github-generator` (SLSA 3). | `ci-verify.yml` relies on a missing script (`attest-slsa.sh` vs existing `sbom-attest.sh`). It falls back to a dummy JSON. |
| **Signing** | None visible. | Signs images with `cosign` (OIDC). | Critical gap: artifacts are not signed in the verification workflow. |
| **Attestation** | None visible. | Attests SBOMs using `cosign attest`. | Critical gap: provenance is not attested. |
| **Blocking** | Provenance/SBOM steps are `continue-on-error: true`. | Blocking. | `ci-verify.yml` effectively allows unverified artifacts to pass. |

## Script Mismatches
- `ci-verify.yml` looks for `scripts/attest-slsa.sh`.
- The actual script is `scripts/sbom-attest.sh`.
- `scripts/sign-artifacts.sh` exists but is not called.

## Governance Enforcement
- `governance-checks` job runs `npm run check:governance` (likely `scripts/check-governance.cjs`).
- `ga-evidence-completeness` job checks `dist/evidence/${GITHUB_SHA}`.
- However, the evidence generation relies on potentially missing or placeholder artifacts.

## Conclusion
`ci-verify.yml` provides a false sense of security regarding supply chain integrity. It has the *structure* of verification but lacks the *substance* because it allows placeholders and continues on error. The robust logic exists in `_reusable-slsa-build.yml` and `scripts/sbom-attest.sh` but is not wired into the main PR gate.

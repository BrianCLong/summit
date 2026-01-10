# Golden Path CI/CD: Supply Chain Integrity

This guide describes the paved road pipeline for producing signed, attestable artifacts with SBOMs for Summit services. The reference implementation targets the `authz-gateway` container image but is reusable for any service.

## Overview

The pipeline is anchored in `.github/workflows/golden-path-supply-chain.yml` and enforces:

- Generation of CycloneDX and SPDX SBOMs via Syft.
- Cosign signatures for the container image and SBOM attestations.
- SLSA v3 provenance attestations using the official generator.
- Policy gate that blocks merges/releases when SBOMs, signatures, provenance, or license/CVE rules are violated.

## How teams adopt it

1. **Opt into the workflow**: The workflow runs on pushes, pull requests, and manual dispatch. To adopt for another service, set the environment variables in the workflow to point at your service context and Dockerfile.
2. **Build + attest**: The `build-reference` job reuses `_reusable-slsa-build.yml` to build, sign, and generate SBOMs for your image.
3. **Policy gate**: The `policy-gate` job reuses `reusable/supply-chain-policy.yml` to verify signatures, attestations, and enforce license/CVE budgets. It fails the check if required artifacts are missing or policy is violated.
4. **Evidence bundle**: The `publish-evidence` job uploads an artifact bundle containing SBOMs and digests so downstream deploy/release steps can verify them in isolated environments.

## Policy rules

- **SBOM required**: Both `sbom.cdx.json` and `sbom.spdx.json` must be present and attested.
- **Signature required**: Cosign signature for the built container using OIDC identity from the reusable SLSA builder.
- **Provenance required**: SLSA provenance attestation must verify via cosign.
- **Licenses**: Only SPDX identifiers listed in `security/supply-chain/license-allowlist.txt` are permitted. Use `security/supply-chain/license-overrides.txt` to temporarily allow reviewed licenses.
- **CVEs**: The gate fails on vulnerabilities with severity `HIGH` or higher unless listed in `security/supply-chain/cve-allowlist.txt`.

## Example evidence bundle

| Item             | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Artifact         | `ghcr.io/<owner>/summit-authz-gateway@sha256:EXAMPLE_DIGEST`                |
| SBOM (CycloneDX) | `sbom.cdx.json` (hash: `sha256:EXAMPLE_CDX`)                                |
| SBOM (SPDX)      | `sbom.spdx.json` (hash: `sha256:EXAMPLE_SPDX`)                              |
| Signatures       | Cosign keyless signatures bound to `_reusable-slsa-build.yml` OIDC identity |
| Attestations     | Cosign attestations for SBOMs (`cyclonedx`, `spdxjson`) and SLSA provenance |

Download the `golden-path-bundle-<run_id>` artifact from a workflow run and use `cosign verify` / `cosign verify-attestation` to validate in a clean environment.

## How to break it intentionally (for validation)

- Delete `sbom.cdx.json` from the build artifact: gate fails at SBOM presence check.
- Tamper with the cosign signature or disable signing: gate fails during `cosign verify`.
- Drop SLSA provenance generation: gate fails verifying `slsaprovenance` attestations.
- Introduce a dependency with a disallowed license or HIGH/CRITICAL CVE not allowlisted: gate fails in `scripts/supply_chain/gate.py`.

## Clean-room verification

1. Download the evidence bundle and export the image digest from the workflow summary.
2. In a fresh machine with `cosign` and `grype` installed:

   ```bash
   cosign verify ghcr.io/<owner>/summit-authz-gateway@<digest> \
     --certificate-oidc-issuer https://token.actions.githubusercontent.com \
     --certificate-identity-regexp '^https://github.com/.+/_reusable-slsa-build.yml@.*$'

   cosign verify-attestation ghcr.io/<owner>/summit-authz-gateway@<digest> --type slsaprovenance
   cosign verify-attestation ghcr.io/<owner>/summit-authz-gateway@<digest> --type cyclonedx

   grype sbom:sbom.spdx.json --fail-on High
   ```

3. Confirm the checks match the workflow results before releasing.

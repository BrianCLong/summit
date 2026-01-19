# Supply Chain Security Procedures

This document outlines the procedures for ensuring supply chain integrity within the Summit ecosystem, aligning with modern standards like SLSA v1.1, Cosign v3, and SPDX v3.0.1.

## 1. SLSA Provenance

We generate SLSA Level 3 provenance for all build artifacts.

- **Generation**: Provenance is automatically generated during the CI/CD build process using the `slsa-framework/slsa-github-generator`.
- **Verification**: Provenance is verified against the `builder.id` (GitHub Actions) and `buildInvocationId`.
- **Storage**: Provenance attestations are stored alongside artifacts in the OCI registry.

## 2. Artifact Signing (Cosign v3)

All container images and release artifacts must be signed using Sigstore's Cosign.

- **Tooling**: We use `cosign` v2.2.4+ (installed via `cosign-installer` v4).
- **Method**: Keyless signing via OIDC (GitHub Actions identity).
- **Bundles**: We use Cosign v3 bundles (`--bundle cosign.bundle.json`) to encapsulate signatures and verification materials.
- **Verification**: Signatures are verified using `cosign verify` with strict identity pinning to the source repository and workflow.

## 3. SBOM Generation (SPDX v3.0.1)

Software Bill of Materials (SBOM) are generated for all artifacts.

- **Tooling**: We use `syft` (latest version) to generate SBOMs.
- **Format**: We target **SPDX v3.0.1** (JSON) where supported, falling back to SPDX 2.3/2.2 for compatibility.
- **Coverage**:
    - Container Images (OS packages, runtime dependencies)
    - NPM Packages (`package.json`, `pnpm-lock.yaml`)
    - Python Packages (`requirements.txt`, `pyproject.toml`)
- **Storage**: SBOMs are attached to OCI images as attestations (`cosign attest --type spdx ...`).

## 4. Policy as Code (OPA/Conftest)

We enforce supply chain policies using Open Policy Agent (OPA) and Conftest.

- **Policy Location**: `policy/supply_chain.rego`
- **Enforcement**: Policies are checked in the CI pipeline (`supply-chain-integrity.yml`).
- **Rules**:
    - Must have SLSA provenance.
    - Must have SBOM in supported SPDX format.
    - Must have valid Cosign signature (and bundle).
    - Must be free of Critical vulnerabilities.

## 5. Lockfile Drift Checks

To ensure reproducible builds, we strictly check for lockfile drift.

- **Mechanism**: `pnpm install --frozen-lockfile` is used in CI.
- **Verification**: `scripts/check-reproducibility.sh` verifies that builds are deterministic.

# Supply Chain Security Implementation

This document outlines the supply chain security measures implemented for the Summit platform, aligning with SLSA Level 3 and industry best practices.

## 1. SLSA (Supply-chain Levels for Software Artifacts)

We strive for SLSA Level 3 compliance to ensure our build process is tamper-proof and verifiable.

*   **Build Service**: We use GitHub Actions, a hosted build service that creates an ephemeral environment for each build.
*   **Provenance**: We generate provenance attesting to the authenticity of the build artifacts. This includes details about the builder, the source code, and the build parameters.
*   **Isolation**: Builds run in isolated containers.

### Verification
To verify the provenance of an artifact:

```bash
cosign verify-attestation --type slsaprovenance <IMAGE_URI>
```

## 2. SBOM (Software Bill of Materials)

We generate SBOMs for every release to track dependencies and vulnerabilities.

*   **Format**: We produce CycloneDX v1.7 (`sbom.cdx.json`) format. This includes Cryptographic Bill of Materials (CBOM) for post-quantum readiness and detailed Intellectual Property (IP) metadata.
*   **Tooling**: We use `cdxgen` to analyze the project structure and dependencies.
*   **Automation**: SBOMs are automatically generated during the CI/CD pipeline.

### Generation
You can generate SBOMs locally using:

```bash
# Generate all SBOMs
npm run sbom:gen

# Generate Server SBOM
npm run sbom:gen:server

# Generate Client SBOM
npm run sbom:gen:client
```

## 3. Dependency Security

*   **Automated Updates**: We use Renovate (`renovate.json`) to automatically update dependencies, pin versions, and apply security patches.
*   **Vulnerability Scanning**:
    *   **Trivy**: Scans the filesystem and container images for known CVEs during the build process.
    *   **npm audit**: Runs as part of the `security:scan` script.
*   **Policy**: We enforce a policy of zero critical vulnerabilities for production releases.

## 4. Artifact Integrity

All release artifacts are signed to ensure they have not been tampered with.

*   **Signing Tool**: We use `cosign` (part of Sigstore) for container image signing and verification.
*   **Transparency Log**: Signatures are recorded in the Rekor transparency log.

### Signing Process
(In CI/CD)
1.  Build artifact (Docker image).
2.  Generate SBOM.
3.  Sign artifact with `cosign sign`.
4.  Attest SBOM with `cosign attest`.

## 5. Compliance & Policy

*   **Code Review**: All changes require PR review (enforced by GitHub branch protection).
*   **History**: Git history is preserved and immutable.
*   **Secrets**: No secrets are stored in the codebase; they are managed via GitHub Secrets and Vault.

# Supply Chain Security Architecture

## Overview

We implement SLSA Level 3 compliance to ensure the integrity of our software supply chain.

## Data Flow

1. **Code Commit**:
   - Branch protection requires signed commits.
   - Gitleaks scans for secrets.
   - Dependency review checks for vulnerable packages.

2. **Build (GitHub Actions)**:
   - Runner: Ephemeral Ubuntu runners.
   - Build Tool: `pnpm` with frozen lockfile.
   - Outputs: Docker Image, NPM Tarball.

3. **Attestation & Signing**:
   - **SBOM**: Generated via CycloneDX and Syft.
   - **Provenance**: Generated via `slsa-github-generator` (isolated workflow).
   - **Signing**: Artifacts are signed with Cosign using GitHub OIDC (Keyless).

4. **Distribution**:
   - Images pushed to GHCR (immutable tags).
   - Signatures and Attestations pushed to OCI registry alongside images.

5. **Deployment**:
   - **Admission Controller / Deploy Script**: verify signature and provenance.
   - Deployment is blocked if verification fails.

## Tools

- **Cosign**: Artifact signing and verification.
- **SLSA Framework**: Provenance generation.
- **Syft / CycloneDX**: SBOM generation.
- **Trivy / OSV**: Vulnerability scanning.
- **Gitleaks**: Secret scanning.

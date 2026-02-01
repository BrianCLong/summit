# Supply Chain Provenance & SBOM Policy

This document defines the requirements for supply-chain integrity, provenance attestations, and Software Bill of Materials (SBOM) for the Summit platform.

## 1. Provenance Requirements (SLSA)

All production artifacts MUST have a verifiable SLSA (Supply-chain Levels for Software Artifacts) provenance attestation.

- **Generation**: Provenance must be generated in a trusted environment (e.g., GitHub Actions using the `slsa-framework/slsa-github-generator`).
- **Identity**: Attestations must use OIDC-based workload identities to cryptographically link the artifact to the specific workflow run and repository.
- **Retention**: Provenance attestations must be stored alongside the release artifacts and retained for the lifetime of the release.

## 2. Software Bill of Materials (SBOM)

Every release must include a machine-readable SBOM in **CycloneDX** (JSON) or **SPDX** format.

- **Scope**: The SBOM must cover all application-level dependencies (NPM, Rust crates, Python packages) and the base container image.
- **Vulnerability Linking**: SBOMs should be used to facilitate vulnerability scanning during the triage process.
- **Accessibility**: The SBOM must be included in the release evidence bundle.

## 3. Verification Gates

Verification is mandatory before any deployment to `production` or `staging`.

- **Signature Verification**: Use `cosign` to verify signatures on container images and binary artifacts.
- **Attestation Verification**: Verify SLSA attestations to ensure artifacts were built on the canonical CI pipeline.
- **Gate Failure**: Any artifact failing provenance or signature verification MUST block the deployment.

## 4. OIDC & Secret-less Build

We prioritize OIDC over long-lived secrets for all supply-chain operations.

- **Cloud Access**: Build and deploy workflows must use OIDC to assume IAM roles in AWS/GCP.
- **Registry Access**: Use `google-github-actions/auth` or equivalent to authenticate to container registries without static keys.

## 5. Evidence & Audit

- The `manifest.json` in the release `dist/` directory serves as the root of evidence for artifact integrity.
- Periodic audits will verify that 100% of production-deployed images have valid provenance.

---

**References:**

- [PROVENANCE_SBOM.md (Runbook)](../runbooks/PROVENANCE_SBOM.md)
- [CI-CD-SECURITY-STANDARDS.md](CI-CD-SECURITY-STANDARDS.md)
- [SLSA Official Documentation](https://slsa.dev/)

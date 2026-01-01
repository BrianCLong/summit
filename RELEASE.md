# Release Process

## "Reproducible, Verifiable, Signed" Checklist

Before promoting any release to production, ensure the following checks pass:

- [ ] **Build & Sign Pipeline**: The `build_sign.yml` workflow must pass on the release tag.
- [ ] **Vulnerability Scans**: No CRITICAL or HIGH vulnerabilities in the Trivy/OSV reports.
- [ ] **SBOM Availability**: `sbom.json` and `syft-sbom.json` are attached to the GitHub Release.
- [ ] **Provenance**: SLSA provenance attestation is generated and verified.
- [ ] **Signature Verification**:
  ```bash
  ./scripts/verify-release.sh v2.0.0
  ```
  Output must show "Verification successful!".

## Release Artifacts

All releases must include:
1. Docker Image (signed, on GHCR)
2. NPM Package Tarball (signed, attached or on registry)
3. SBOMs (CycloneDX JSON)
4. SLSA Provenance Attestation

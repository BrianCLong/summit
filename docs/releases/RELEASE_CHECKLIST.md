# Release Checklist

This checklist ensures that every release meets the supply chain integrity standards required for Summit.

## Supply Chain Integrity
- [ ] **Tag commit**: Ensure the commit is tagged with the version (e.g., `vX.Y.Z`).
- [ ] **Verify Build**: Run `verify-release.yml` and ensure it passes.
- [ ] **Package Artifacts**:
  - [ ] Binary / Distributable
  - [ ] SPDX SBOM (`sbom.spdx.json`)
  - [ ] CycloneDX SBOM (`sbom.cdx.json`)
  - [ ] Provenance Attestation (`provenance.link`)
  - [ ] Cosign Signatures for all artifacts
- [ ] **GitHub Release**: Attach all packaged artifacts and signatures to the GitHub release.
- [ ] **Provenance Check**: Verify that the provenance link correctly references the build.

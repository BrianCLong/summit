# Release Checklist

This checklist ensures that every release meets the Summit-quality supply chain integrity standards.

## Pre-Release Phase
- [ ] All CI/CD workflows passed on `main` branch.
- [ ] Reproducible build verification successful (`scripts/ci/run-repro-build.sh`).
- [ ] SBOMs generated (SPDX + CycloneDX).
- [ ] Provenance attestation created and signed (`.slsa/provenance.link`).
- [ ] OPA policies passed (`policy/require-sbom.rego`).

## Release Phase
- [ ] Tag the commit: `git tag vX.Y.Z && git push origin vX.Y.Z`.
- [ ] Verify `Verify Build + Signatures` workflow completed successfully.
- [ ] Download and verify release artifacts:
    - [ ] Binary / Dist files.
    - [ ] SBOM (SPDX).
    - [ ] SBOM (CycloneDX).
    - [ ] Provenance attestation.
    - [ ] Cosign signatures.

## Post-Release Phase
- [ ] Update `docs/security/security_ledger.yml` with the latest artifact paths.
- [ ] Publish AE (Artifact Evidence) bundles to the internal ledger.
- [ ] Verify the release is publicly verifiable via `cosign verify`.

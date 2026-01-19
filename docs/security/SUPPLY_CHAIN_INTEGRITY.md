# Supply Chain Integrity

This document defines Summit’s baseline software supply chain integrity controls and CI evidence outputs.

## Evidence Bundle Output

Each CI run produces a content-addressed evidence bundle at:

`artifacts/supply-chain/<GIT_SHA>/`

Contents (minimum):
- `sbom/sbom.spdx.json`
- `sbom/sbom.cdx.json`
- `provenance/metadata.json`
- `manifest.json`

Optional (if signing enabled):
- `signatures/sbom.spdx.sig`
- `signatures/sbom.cdx.sig`

## Determinism Requirements

Evidence artifacts must not contain timestamps, random UUIDs, or environment-dependent fields unless explicitly documented and gated.
The `manifest.json` file is derived solely from file bytes in the evidence bundle.

## CI Workflows

Workflow:
- Supply Chain Integrity: `.github/workflows/ci-supply-chain.yml` (Consolidates build, prove, sign, and policy gating)

## Secrets

Signing is key-based (cosign) and is enabled when secrets are configured:
- `COSIGN_PRIVATE_KEY` (private key material, PEM)
- `COSIGN_PASSWORD` (password for encrypted key)
- `COSIGN_PUBLIC_KEY` (public key, PEM)

If secrets are absent, workflows still generate SBOMs and manifests; signatures are skipped.

## Policy-as-Code Gate

Conftest evaluates OPA policies in `policy/` against evidence presence.
Current policy requires:
- SPDX SBOM present
- CycloneDX SBOM present
- evidence manifest present

## Future Enhancements (Planned)

- SLSA provenance attestations (in-toto / SLSA predicate)
- Rekor transparency log integration (keyless signing)
- Dependency allow/deny policies sourced from governance registry

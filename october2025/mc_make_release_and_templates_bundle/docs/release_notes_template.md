# Release Notes – {{VERSION}} ({{DATE}})

## Summary
- Brief one-liner describing the release.

## Evidence
- SBOM: attached as `sbom.json` (CycloneDX)
- SLSA Provenance: uploaded via SLSA generator (see release assets)
- Attestation verify (cosign): `cosign verify-attestation --type slsaprovenance <artifact>`

## Highlights
- Feature A — user impact
- Feature B — ops impact

## Breaking Changes
- n/a

## Security
- Dependencies updated via Renovate groups
- OPA release gate: **passed**
- Signatures/attestations: **verified**

## Metrics (fill in)
- p95 PR CI duration:
- Success ratio:
- Flaky count trend:

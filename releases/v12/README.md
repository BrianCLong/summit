# Release v12 Evidence Pack (Sprint 12 Seed)

This directory is the Sprint 12 baseline location for customer-facing release evidence artifacts.

## Expected Artifacts

- `evidence-pack.json` (machine-readable pack)
- `evidence-pack.md` (human-readable summary)
- `SBOM.json` (CycloneDX output at release cut)
- `attestation.json` (provenance attestation summary)
- `vuln_report.json` (CVE report vs budget)

## Verification Contract

- Pack must be signed using Sigstore/cosign at release cut.
- Verification output must report pass/fail and include signer identity policy.
- All referenced files must be hash-addressable and reproducible.

## Notes

- Current files in this directory are Sprint planning placeholders and schema examples.
- Release cut must replace placeholders with generated artifacts from CI.

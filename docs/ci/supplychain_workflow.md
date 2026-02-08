# Supply Chain Workflow (SBOM Attestation + Evidence Badge)

## Overview
The supplychain workflow produces:

- SPDX SBOM
- SBOM attestation (OIDC/keyless)
- Verification output (cosign)
- Deterministic evidence summary + badge payload

## Outputs
- `out/evidence/<sha>/badge.json`
- `out/evidence/<sha>/evidence.summary.json`
- Attestation bundle artifact

## Gates
- `ci/gates/actions_sha_pinned.sh`
- `ci/gates/attestation_verification_required.sh`
- `ci/gates/public_evidence_redaction_pass.sh`

## References
- `actions/attest-sbom`
- `sigstore/cosign`
- Shields endpoint badge schema

# Attestation Modes

## BuildKit Attestations
We use Docker BuildKit to generate attestations at build time:
- `--sbom=true`: Generates SPDX SBOM.
- `--provenance=mode=min`: Generates SLSA Provenance.

We start with `mode=min` to ensure build secrets are not accidentally exposed in build arguments.
Upgrade to `mode=max` requires an audit of all build arguments to ensure no secrets are passed.

## Cosign Attestation
BuildKit stores attestations in the image index (embedded).
However, Policy Controller usually expects signed attestations (DSSE).
We extract the BuildKit predicates and re-attest them using Cosign to make them enforceable by Policy Controller.

# Transparency Log Integration

Defines transparency log usage across artifacts for verifiability and non-repudiation.

## Requirements

- **Append-only:** operations produce signed entries; deletion is disallowed.
- **Entry content:** artifact digest or Merkle root, replay token, issuer identity, timestamp, and scope.
- **Audit APIs:** list, lookup by digest, and prove inclusion/exclusion.

## Usage

- **Shard manifests:** record commitments and signatures for cross-party verification.
- **Role certificates, attribution artifacts, governance reports, inversion artifacts:** publish digests to enable public proof of existence.
- **Attestation tie-in:** include TEE attestation quotes when available to strengthen provenance.

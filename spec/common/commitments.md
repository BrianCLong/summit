# Commitment Schemes

Commitments provide tamper-evident linkage between artifacts and their referenced identifiers or payloads.

## Merkle Commitments

- **Leaves:** hashed identifiers (actor IDs, edge IDs, signal hashes, fixture IDs, shard hashes) using domain-separated prefixes.
- **Tree:** balanced Merkle tree with deterministic ordering to allow reproducible roots.
- **Root usage:** embedded in certificates, reports, or manifests to guarantee integrity.

## Witness Chains

- **Definition:** ordered commitments to intermediate results enabling replay and verification without revealing full data.
- **Applications:** transform inversion, role certificates, attribution artifacts, governance reports, shard manifests.

## Security Notes

- Use collision-resistant hashes (e.g., SHA-256) with domain separation to avoid cross-domain collisions.
- Bind commitments to replay tokens to prevent reuse across incompatible datasets.

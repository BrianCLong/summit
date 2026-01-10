# Commitment Schemes

Commitments provide tamper-evident linkage between artifacts and their referenced identifiers or
payloads. Commitments are deterministic, reproducible, and scoped by a domain separator to prevent
cross-family collisions.

## Canonicalization

- **Input normalization:** identifiers are normalized (case, whitespace) and encoded as UTF-8.
- **Ordering:** leaves are sorted deterministically by `(type, identifier)` to avoid permutation
  ambiguity.
- **Domain separation:** each leaf is prefixed with a domain tag such as `role::`,
  `signal::`, `fixture::`, or `shard::`.

## Merkle Commitments

- **Leaves:** hashed identifiers (actor IDs, edge IDs, signal hashes, fixture IDs, shard hashes)
  with domain-separated prefixes.
- **Tree:** balanced Merkle tree with deterministic ordering to allow reproducible roots.
- **Root usage:** embedded in certificates, reports, or manifests to guarantee integrity.
- **Proofs:** inclusion proofs are stored alongside artifacts when selective disclosure is required.

## Witness Chains

- **Definition:** ordered commitments to intermediate results enabling replay and verification
  without revealing full data.
- **Applications:** transform inversion, role certificates, attribution artifacts, governance
  reports, shard manifests.
- **Linkage:** each witness chain entry includes the prior hash, preventing reordering.

## Salt & Privacy

- **Per-recipient salts:** evidence shards or redacted artifacts use a salt to prevent hash
  correlation across recipients.
- **Salt registry:** salts are stored in a secure enclave or key vault and referenced by identifier
  in the replay token.

## Security Notes

- Use collision-resistant hashes (e.g., SHA-256) with domain separation to avoid cross-domain
  collisions.
- Bind commitments to replay tokens to prevent reuse across incompatible datasets.
- Store hash function identifiers in artifacts to ensure verification remains stable across
  upgrades.

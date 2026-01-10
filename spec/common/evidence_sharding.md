# Evidence Sharding

Shared mechanics for partitioning evidence into policy-scoped shards with verifiable manifests.

## Partitioning

- Derive sharing scopes from policy and recipient identities.
- Apply selective disclosure: redaction, aggregation, hashing, or suppression.
- Replace identifiers with salted commitments per recipient.

## Manifest

- **Shard list:** shard identifiers, sizes, and scope identifiers.
- **Commitments:** Merkle root over shard hashes.
- **Replay token:** time window, scan config hash, module versions.

## Verification

- Recipients verify shard commitments without access to undisclosed shards.
- Manifests are signed and stored in the transparency log.

## Controls

- Enforce egress budgets per shard (bytes, entity count).
- Generate counterfactual partitions to estimate information loss.

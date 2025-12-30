# Evidence Sharding and Selective Disclosure

Defines the mechanics for partitioning OSINT scan results into shareable shards under policy-derived scopes.

## Inputs

- **Scan results:** entities, relations, and annotations from collection runs.
- **Policy specification:** per-recipient scopes, purposes, and disclosure constraints.

## Partitioning

- **Selective disclosure:** aggregation, redaction, hashed identifiers, and suppression of sensitive fields.
- **Salted commitments:** recipient-unique salts applied to commitments to prevent cross-recipient correlation.
- **Egress budgets:** per-shard limits for bytes or entity counts.

## Artifacts

- **Shard manifest:** commitments to shards and scope identifiers; signed and optionally stored in an append-only transparency log.
- **Evidence shards:** payload aligned to scopes with policy decision tokens binding recipient identity and purpose; replay token with module versions, time window, and scan configuration hash.

## Verification

- **Zero-knowledge style verification:** verifier can confirm shard integrity via commitments without access to unshared shards.
- **Counterfactual partitions:** evaluate alternative policies and estimate information loss.

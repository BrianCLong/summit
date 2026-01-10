# MEP: Multi-Party Evidence Partitioning

MEP partitions OSINT scan outputs into policy-scoped evidence shards with verifiable manifests,
allowing collaboration without over-sharing.

## Inputs

- OSINT scan results for one or more targets.
- Policy specification and recipient identities.
- Egress budgets per recipient.

## Outputs

- Evidence shards per recipient scope.
- Shard manifest with commitments, signatures, and replay token.
- Counterfactual partitions for information-loss estimation.

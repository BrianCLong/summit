# Cluster Witness Format

## Components

- **Commitment to Identifiers:** Merkle root of salted identifier hashes; leaves store identifier type and salt hint.
- **Support Set:** Minimal linkage features (feature IDs + hashes) proving merge or split.
- **Policy Scope:** Tenant IDs, federation token reference, and allowed export scope.
- **Determinism Token:** Snapshot ID, seed, and version set for clustering config.
- **Confidence Interval:** Lower/upper bounds for each identifier's membership probability.

## Emission Triggers

- Initial cluster creation above confidence threshold.
- Merge event when combined cluster passes merge criterion.
- Split event when posterior confidence drops below split threshold.

## Storage & Access

- Persisted to witness ledger and anchored in transparency log.
- Cached by query signature (request parameters + artifact version) for fast reuse.
- Export requests must meet disclosure constraints before returning witness data.

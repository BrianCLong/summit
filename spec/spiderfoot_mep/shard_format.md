# Evidence Shard Format

- **Content:** selectively disclosed fields (aggregations, redactions, hashed IDs) per recipient scope.
- **Commitments:** salted commitments unique per recipient; Merkle root recorded in manifest.
- **Policy token:** binds recipient identity, purpose, and scope to shard delivery.
- **Replay token:** module version set, time window, scan configuration hash.

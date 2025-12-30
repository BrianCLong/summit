# Delta Log

**Purpose:** Append-only record of state deltas applied by action instances.

**Fields**

- Snapshot ID before/after, action instance ID, contract hash, policy decision ID.
- Hash commitments to inputs/outputs; witness chain anchor.

**Properties**

- Supports hash chaining for tamper evidence.
- Enables replay via determinism token and delta sequence.

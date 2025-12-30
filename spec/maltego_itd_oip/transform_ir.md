# Transform IR

**Nodes:** Transform operations keyed by transform signature; entities with canonicalized keys.

**Edges:** Dataflow edges annotated with schema, policy token, and cache hint.

**Annotations:**

- Replay token for data source versions and graph snapshots.
- Cost estimates per node; batching groups with rate-limit contracts.

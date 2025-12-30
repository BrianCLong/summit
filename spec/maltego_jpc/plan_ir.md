# Plan IR (JPC)

## Structure

- Typed nodes for intermediate entities and transforms.
- Join edges with predicates and required provenance annotations.
- Filter expressions eligible for pushdown into source queries.

## Optimization

- Solve cost objective minimizing source calls and egress bytes under rate/license constraints.
- Group queries by endpoint for batching; reuse cached results when signatures match and source versions are current.
- Capture plan hashes and replay tokens for verification and caching.

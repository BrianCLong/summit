# Macro Synthesis

## Synthesis Steps

1. Select grammar productions that satisfy policy/license constraints.
2. Assemble candidate macro graph.
3. Optimize for batching, deduplication, and caching.
4. Emit macro artifact with justification and commitments.

## Artifact Fields

- `macro_graph`
- `justification`
- `expected_cost`
- `replay_token`
- `commitment_root`

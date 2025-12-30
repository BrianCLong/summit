# Claims – ITD-OIP

## Independent Claims

1. **Method:** Record investigation trace of transform operations; lower into IR execution plan; optimize by deduping transforms, batching calls, reordering joins, or pushing filters; verify against policy/license constraints; execute optimized plan; generate witness chain and macro artifact with optimized plan.
2. **System:** Trace recorder, IR compiler, plan optimizer, policy/license verifier, and witness store persisting witness chain and macro artifact.

## Dependent Variations

3. Deduplication via canonical entity keys and memoization by transform signature.
4. Batching with rate-limit contracts and p95 latency budgets.
5. Reject export transforms without authorization token.
6. Macro artifact includes replay token for data source versions and graph snapshots.
7. Cache storing transform outputs with TTL and invalidation on policy version change.
8. Witness chain with commitments to inputs/outputs and policy decision ID per transform.
9. Cost estimate generated for optimized plan and exposed in audit interface.
10. Execution materializes results into graph store as typed nodes/edges with provenance.
11. Plan optimizer learns rewrite rules from multiple traces.
12. Macro artifact shareable across tenants via salted commitments to entity identifiers.

# Origin Certificate

## Required Fields

- `origin_set`: array of node IDs.
- `uncertainty`: posterior distribution or confidence interval.
- `alternative_sets`: ranked alternatives with likelihood ratios.
- `explanation_subgraph_ref`: pointer to evidence subgraph.
- `commitment_root`: Merkle root of evidence IDs.
- `replay_token`: determinism token.
- `policy_decision_id`: policy-as-code decision reference.
- `attestation_quote?`: optional TEE quote.

## Validation

1. Verify commitments against evidence store.
2. Validate policy decision via policy gateway.
3. Recompute determinism replay if required.
4. Verify attestation when present.

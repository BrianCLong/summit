# PRC Claims (Method, System, CRM)

## Independent claims

1. Method: receive transform specification; generate transform capsule with interface contract, execution plan, proprietary declaration; execute transform to produce outputs and witness chain; package outputs, witness chain, and execution harness into capsule; output capsule for third-party evaluation.
2. System: processors and memory executing the method above.
3. Computer-readable medium: instructions to perform the method above.

## Dependent claims

4. Interface contract includes effect types comprising READ, WRITE, or EXPORT.
5. Proprietary-element declaration specifies components excluded from disclosure and corresponding stubs for evaluation.
6. Enforce rate-limit contract and egress byte budget during execution.
7. Execution harness includes seeded determinism and a replay manifest.
8. Peer-review package includes intermediate artifacts and minimal datasets.
9. Cache transform results keyed by capsule hash and invalidate on version change.
10. Counterfactual execution under a stricter disclosure rule reports information loss.
11. Capsule includes cryptographic commitments to outputs via a Merkle root.
12. System includes a transparency log storing capsule digests.
13. System includes a trusted execution environment configured to attest to transform execution.
14. Capsule metadata is structured for FAR-based clause applicability tracking when relevant.

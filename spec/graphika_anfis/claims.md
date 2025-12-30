# Claims – ANFIS

## Independent Claims

1. **Method:** Ingest social content into a temporal graph; compute coordination fingerprint using burstiness, near-duplicate similarity, and hub concentration; generate intervention plan to remove/down-weight/gate nodes or edges; simulate spread metrics on the modified graph; emit narrative attribution artifact with fingerprint, metrics, and replay token bound to the snapshot.
2. **System:** Includes graph store, coordination fingerprinting engine, intervention simulator, and evidence artifact generator that outputs the attribution artifact with replay token.

## Dependent Variations

3. Link laundering score from redirection chains and shared URL reuse.
4. Near-duplicate similarity via LSH over canonicalized text and media hashes.
5. Intervention plan optimized under budget trading spread reduction vs. cost.
6. Replay token with seed, graph snapshot ID, and schema version for determinism.
7. Provenance record per feature identifying contributing content and source.
8. Merkle commitment over content item identifiers in the artifact.
9. Multiple counterfactual interventions ranked by spread reduction per unit cost.
10. Temporal graph construction enforces policy decisions and redacts content in artifacts.
11. Simulator enforces latency budget and halts on max expansion breach.
12. Trusted execution environment attestation included in attribution artifact.

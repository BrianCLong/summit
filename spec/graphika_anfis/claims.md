# ANFIS Claims (Draft)

## Independent Claims

1. **Method**: A computer-implemented method comprising:
   1. ingesting social content items and associated actor identifiers within a time window;
   2. constructing a temporal graph comprising nodes representing at least content items,
      actors, and referenced resources and edges representing authored, reshared, and linked
      relations;
   3. computing a coordination fingerprint for a narrative cluster using two or more
      coordination features including at least timing burstiness, near-duplicate similarity,
      and hub concentration;
   4. generating an intervention plan specifying a modification to the temporal graph
      comprising removal, down-weighting, or gating of one or more nodes or edges;
   5. simulating an effect of the intervention plan by recomputing one or more spread
      metrics over a modified graph; and
   6. outputting a narrative attribution artifact comprising the coordination fingerprint,
      the spread metrics, and a replay token binding the artifact to the time window and
      graph snapshot.

2. **System**: A system comprising:
   1. a graph store configured to store the temporal graph;
   2. a coordination fingerprinting engine configured to compute the coordination fingerprint;
   3. an intervention simulator configured to apply the intervention plan and compute the
      spread metrics; and
   4. an evidence artifact generator configured to output the narrative attribution artifact
      including the replay token.

## Dependent Claims

3. The method of claim 1, wherein computing the coordination fingerprint further comprises
   computing a link laundering score based on redirection chains and shared URL reuse across
   actors.
4. The method of claim 1, wherein near-duplicate similarity is computed using locality-sensitive
   hashing over canonicalized text and media hashes.
5. The method of claim 1, wherein the intervention plan is selected by optimizing a constrained
   objective that trades off predicted spread reduction against an intervention budget.
6. The method of claim 1, wherein the replay token comprises a seed, a graph snapshot identifier,
   and a schema version enabling deterministic recomputation of the spread metrics.
7. The method of claim 1, further comprising attaching a provenance record to each coordination
   feature identifying at least one contributing content item and ingestion source.
8. The method of claim 1, wherein the narrative attribution artifact further comprises a
   cryptographic commitment to included content item identifiers via a Merkle root.
9. The method of claim 1, wherein the simulation applies multiple counterfactual interventions
   and outputs a ranked list of interventions based on predicted spread reduction per unit cost.
10. The method of claim 1, wherein constructing the temporal graph comprises enforcing access
    policy decisions and producing redacted content bytes in the narrative attribution artifact.
11. The system of claim 2, wherein the intervention simulator enforces a latency budget and
    terminates simulation early upon exceeding a maximum expansion count.
12. The system of claim 2, further comprising a trusted execution environment configured to
    attest to execution of the fingerprinting engine and simulator, wherein the attribution
    artifact includes an attestation quote.
13. The method of claim 1, further comprising emitting a witness chain of commitments over
    preprocessing, fingerprinting, and simulation steps, and storing the witness chain in an
    append-only ledger.
14. The system of claim 2, wherein the graph store produces a deterministic snapshot identifier
    derived from ordered node and edge identifiers and a schema version.

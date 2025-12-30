# Coordination Fingerprinting and Intervention Simulation (ANFIS) — Claims

## Independent Claims

1. **Method.** A computer-implemented method comprising:
   1. receiving, by one or more processors, a plurality of content items and associated actor identifiers occurring within a time window;
   2. constructing a temporal interaction graph, the temporal interaction graph comprising (i) nodes representing at least content items, actors, and referenced resources and (ii) edges representing at least authored, reshared, or linked interactions, each edge associated with a timestamp;
   3. identifying a narrative cluster comprising a subset of the plurality of content items;
   4. computing, for the narrative cluster, a coordination fingerprint comprising at least two coordination features selected from timing burstiness, near-duplicate content similarity, hub concentration, cross-platform reuse, and link laundering score;
   5. generating an intervention plan specifying at least one modification to the temporal interaction graph, the at least one modification comprising removal of a node, removal of an edge, down-weighting of an edge, or gating access to a referenced resource;
   6. simulating an effect of the intervention plan by applying the at least one modification to the temporal interaction graph to form a modified graph and computing at least one spread metric over the modified graph; and
   7. outputting an attribution artifact comprising the coordination fingerprint, the at least one spread metric, and a replay token binding the attribution artifact to at least the time window and a graph snapshot identifier.

2. **System.** A system comprising: one or more processors; and one or more non-transitory computer-readable media storing instructions that, when executed by the one or more processors, cause the system to perform operations comprising the method of claim 1.

3. **Computer-readable medium.** A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein the near-duplicate content similarity is computed by locality-sensitive hashing over canonicalized text or media perceptual hashes.
5. The method of claim 1, wherein computing the coordination fingerprint further comprises computing the link laundering score based on redirection chains and repeated URL reuse across distinct actors.
6. The method of claim 1, wherein generating the intervention plan comprises optimizing an objective that trades off predicted spread reduction against an intervention budget comprising at least one of a maximum number of modified nodes, a maximum number of modified edges, or a maximum gating list size.
7. The method of claim 1, wherein simulating the effect is terminated upon exceeding a computation budget comprising at least one of a maximum expansion count, a maximum execution time, or a maximum memory usage.
8. The method of claim 1, wherein the replay token comprises a seed value, a schema version identifier, and an index version identifier in addition to the graph snapshot identifier.
9. The method of claim 1, wherein the attribution artifact further comprises provenance references identifying at least one ingestion source for each of the at least two coordination features.
10. The method of claim 1, wherein outputting the attribution artifact comprises including a cryptographic commitment to identifiers of the subset of content items via a Merkle root.
11. The method of claim 1, wherein the intervention plan comprises a plurality of counterfactual interventions and the attribution artifact further comprises a ranking of the plurality of counterfactual interventions.
12. The method of claim 1, wherein constructing the temporal interaction graph comprises enforcing an access policy and outputting redacted content bytes in the attribution artifact.
13. The system of claim 2, further comprising a trusted execution environment configured to generate an attestation quote, wherein the attribution artifact includes the attestation quote bound to a trace digest.
14. The method of claim 1, wherein identifying the narrative cluster comprises clustering content items using at least one of embedding similarity or shared referenced resources.

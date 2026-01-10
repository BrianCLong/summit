# Claims — IPIO

## Independent Claim 1 — Method
1. A computer-implemented method comprising:
   1. receiving content interaction events within a time window associated with a narrative cluster;
   2. constructing a temporal propagation graph comprising nodes representing at least actors and content items and edges representing propagation interactions with timestamps;
   3. fitting a diffusion model to the temporal propagation graph to estimate propagation parameters;
   4. performing inverse inference over the diffusion model to identify a candidate origin set comprising one or more nodes that explain observed propagation under a minimality constraint;
   5. computing an uncertainty measure for the candidate origin set; and
   6. outputting an origin certificate comprising the candidate origin set, the uncertainty measure, and a replay token binding the origin certificate to a snapshot identifier and the time window.

## Independent Claim 2 — System
2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — Computer-Readable Medium
3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims
4. The method of claim 1, wherein the diffusion model comprises an independent cascade model, a linear threshold model, or a Hawkes-process model.
5. The method of claim 1, wherein inverse inference comprises minimizing a loss between observed activation times and predicted activation times subject to a cardinality budget on the candidate origin set.
6. The method of claim 1, wherein the uncertainty measure comprises a posterior probability distribution over origin nodes or a confidence interval over origin set size.
7. The method of claim 1, further comprising outputting an alternative origin set and a likelihood ratio comparing the alternative origin set to the candidate origin set.
8. The method of claim 1, wherein the origin certificate includes a localized explanation subgraph selected under an explanation budget limiting nodes or edges.
9. The method of claim 1, further comprising enforcing a computation budget comprising at least one of maximum edges processed, maximum runtime, or maximum memory during inverse inference.
10. The method of claim 1, wherein the replay token comprises a seed value, a schema version, and an index version in addition to the snapshot identifier.
11. The method of claim 1, wherein the origin certificate includes a cryptographic commitment to identifiers of evidence nodes via a Merkle root.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to inverse inference, wherein the origin certificate includes an attestation quote.
13. The method of claim 1, further comprising generating a counterfactual suppression plan that removes at least one candidate origin node and estimating an impact on predicted propagation.

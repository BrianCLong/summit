# Claims — Confidence-Interval Identity Resolution with Witnesses (CIRW)

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 receiving a plurality of identifiers associated with online activity, the plurality of identifiers comprising at least two identifier types selected from usernames, account identifiers, email addresses, domains, wallet addresses, or device identifiers;
   1.2 computing a plurality of linkage features for pairs of identifiers, the plurality of linkage features comprising at least one of temporal co-occurrence, shared resource linkage, string similarity, network proximity, or behavioral similarity;
   1.3 forming identity clusters by applying a probabilistic clustering model to the plurality of linkage features, wherein each identity cluster is associated with an uncertainty measure;
   1.4 generating, for at least one identity cluster, a cluster witness comprising (i) a support set of linkage features and (ii) a commitment to identifiers included in the identity cluster;
   1.5 storing a resolution artifact comprising the identity cluster, the uncertainty measure, and the cluster witness; and
   1.6 outputting, responsive to a query, a set of candidate identity clusters and corresponding uncertainty measures.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause the system to perform the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein the probabilistic clustering model comprises a Bayesian model that outputs a posterior probability for cluster membership.
5. The method of claim 1, wherein the uncertainty measure comprises a confidence interval for at least one cluster membership probability.
6. The method of claim 1, further comprising performing a merge operation or a split operation on an identity cluster based on a confidence threshold and emitting an updated cluster witness.
7. The method of claim 1, wherein generating the cluster witness comprises selecting a minimal support set under a proof budget limiting at least one of feature count or verification time.
8. The method of claim 1, wherein the commitment to identifiers comprises a Merkle root over salted identifier hashes.
9. The method of claim 1, further comprising enforcing a policy scope constraint such that identifiers from different tenants are not clustered absent a federation authorization token.
10. The method of claim 1, wherein outputting comprises filtering candidate identity clusters based on a minimum confidence threshold specified in the query.
11. The system of claim 2, further comprising a cache keyed by a query signature and a resolution artifact version to reuse candidate identity clusters.
12. The method of claim 1, wherein the linkage features include cross-platform media perceptual hash matching.
13. The method of claim 1, further comprising emitting a determinism token comprising a snapshot identifier and a seed value enabling replay of clustering.

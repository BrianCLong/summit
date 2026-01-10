# IOC Lifecycle Compiler with Provenance-Weighted Decay (ILC-PWD) — Claims

## Independent Claims

1. **Method.** A computer-implemented method comprising:
   1. receiving an intelligence entity identifier;
   2. retrieving, from a plurality of data sources, a set of evidence items associated with the intelligence entity identifier, the plurality of data sources comprising at least one telemetry source and at least one feed source;
   3. computing an aggregate confidence value by applying a provenance-weighted decay function to the set of evidence items, the provenance-weighted decay function based on at least a source trust attribute and an evidence freshness attribute;
   4. computing a conflict measure for the set of evidence items;
   5. determining a lifecycle state of the intelligence entity from a plurality of lifecycle states based on the aggregate confidence value and the conflict measure;
   6. generating a transition proof comprising a support set of evidence items sufficient to justify the lifecycle state; and
   7. outputting a lifecycle artifact comprising the lifecycle state, the transition proof, and a replay token binding the lifecycle artifact to at least one of a policy version or an index version.

2. **System.** A system comprising: one or more processors; and one or more non-transitory computer-readable media storing instructions that, when executed, cause the one or more processors to: retrieve the set of evidence items; compute the aggregate confidence value; compute the conflict measure; determine the lifecycle state; generate the transition proof; and output the lifecycle artifact.

3. **Computer-readable medium.** A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the one or more processors to perform the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein the plurality of lifecycle states comprises at least NEW, CORROBORATING, ACTIVE, DEPRIORITIZED, and RETIRED.
5. The method of claim 1, wherein the conflict measure comprises a contradiction score computed from mutually exclusive claims extracted from the set of evidence items.
6. The method of claim 1, wherein the provenance-weighted decay function applies distinct decay parameters for distinct evidence classes comprising at least sightings, exploit reports, and remediation confirmations.
7. The method of claim 1, wherein the support set is a minimal support set computed under a proof budget limiting at least one of a number of evidence items, total content bytes, or verification time.
8. The method of claim 1, further comprising computing a counterfactual impact of a remediation action on the aggregate confidence value and outputting the counterfactual impact in the lifecycle artifact.
9. The method of claim 1, wherein the replay token comprises a snapshot identifier and a time window in addition to the policy version or the index version.
10. The method of claim 1, further comprising generating a signed policy decision token binding a subject context and a purpose to access of the set of evidence items.
11. The method of claim 1, wherein outputting the lifecycle artifact comprises including a cryptographic commitment to hashes of the set of evidence items via a Merkle proof.
12. The system of claim 2, further comprising a caching layer that caches the lifecycle state keyed by the intelligence entity identifier and the replay token.
13. The method of claim 1, wherein determining the lifecycle state comprises applying a hysteresis rule to reduce oscillation between adjacent lifecycle states.
14. The method of claim 1, further comprising outputting a timeline of lifecycle state transitions including the transition proof for each transition.

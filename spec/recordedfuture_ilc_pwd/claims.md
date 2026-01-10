# ILC-PWD Claims (Draft)

## Independent Claims

1. **Method**: A computer-implemented method comprising:
   1. retrieving evidence items associated with an intelligence entity from a plurality of
      sources including at least one telemetry source and one open source feed;
   2. computing, using provenance-weighted decay, an aggregate confidence value from the
      evidence items based on source trust and evidence freshness;
   3. determining a lifecycle state for the intelligence entity from a plurality of states
      including at least NEW, ACTIVE, and RETIRED based on the aggregate confidence value and
      one or more conflict measures;
   4. generating a transition proof comprising a minimal support set of evidence items
      sufficient to justify transition to the lifecycle state; and
   5. outputting a lifecycle update artifact comprising the lifecycle state, the transition
      proof, and a replay token.

2. **System**: A system comprising:
   1. an evidence aggregator configured to retrieve evidence items and compute
      provenance-weighted decay;
   2. a lifecycle state engine configured to compute the lifecycle state;
   3. a proof generator configured to compute the minimal support set; and
   4. an artifact store configured to persist the lifecycle update artifact with the replay
      token.

## Dependent Claims

3. The method of claim 1, wherein the conflict measures comprise a contradiction score computed
   from mutually exclusive claims extracted from the evidence items.
4. The method of claim 1, wherein the lifecycle state engine applies different decay parameters
   per evidence class including exploit reports, sightings, and remediation confirmations.
5. The method of claim 1, further comprising computing a counterfactual impact of at least one
   remediation action on the lifecycle state and outputting the counterfactual impact in the
   lifecycle update artifact.
6. The method of claim 1, wherein the minimal support set is computed under a maximum proof
   budget limiting at least one of: number of evidence items, total bytes, or verification time.
7. The method of claim 1, wherein the replay token includes a policy version and an index version
   to ensure deterministic recomputation of the aggregate confidence value.
8. The method of claim 1, further comprising generating a signed policy decision token binding a
   subject context and purpose to access of the evidence items.
9. The method of claim 1, wherein the lifecycle update artifact includes a cryptographic
   commitment to evidence item hashes via a Merkle proof.
10. The system of claim 2, further comprising a caching layer that caches computed lifecycle
    states keyed by entity identifier and replay token components.
11. The system of claim 2, wherein the evidence aggregator enforces an egress budget limiting
    returned content bytes and returns redacted evidence bytes.
12. The method of claim 1, wherein the lifecycle state engine emits a state transition timeline
    and computes state stability based on variance of the aggregate confidence value over time.
13. The system of claim 2, wherein lifecycle transitions are logged in a witness ledger with
    commitments to the transition proof and determinism token.

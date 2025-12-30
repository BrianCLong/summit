# Claims — SASA

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 receiving a decision request for an entity, the decision request specifying a decision function over threat signals;
   1.2 retrieving threat signals from a plurality of sources;
   1.3 computing a decision output using the decision function;
   1.4 computing, for at least one source of the plurality of sources, a marginal contribution score to the decision output using a Shapley-style attribution procedure;
   1.5 generating an attribution artifact comprising the decision output and at least one marginal contribution score; and
   1.6 outputting the attribution artifact with a replay token binding the attribution artifact to a time window and an index version.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein computing the marginal contribution score comprises approximating Shapley values using a sampling budget limiting a number of source permutations.
5. The method of claim 1, wherein the decision function comprises a fusion function over signals weighted by provenance attributes.
6. The method of claim 1, further comprising producing a counterfactual decision output for removal of a selected source and including the counterfactual decision output in the attribution artifact.
7. The method of claim 1, wherein the attribution artifact includes a minimal support set of signals under a proof budget limiting evidence count or bytes.
8. The method of claim 1, wherein the replay token comprises a policy version and a snapshot identifier in addition to the index version.
9. The method of claim 1, wherein the attribution artifact includes signed policy decision tokens binding subject context and purpose to access of the signals.
10. The system of claim 2, further comprising a cache keyed by entity identifier and replay token to reuse marginal contribution scores.
11. The method of claim 1, wherein outputting the attribution artifact comprises including a cryptographic commitment to hashes of the threat signals via a Merkle root or Merkle proof.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to the attribution procedure, wherein the attribution artifact includes an attestation quote.
13. The method of claim 1, further comprising emitting an alert when a single source marginal contribution score exceeds a concentration threshold.

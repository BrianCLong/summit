# Claims — IDCP

## Independent Claim 1 — Method
1. A computer-implemented method comprising:
   1. receiving a plurality of indicator records from a plurality of feeds, each indicator record comprising an indicator value and at least one associated context attribute;
   2. computing a set of candidate equivalence relations between indicator records using at least one of context similarity, provenance similarity, or graph neighborhood similarity;
   3. determining at least one collision condition wherein a same indicator value corresponds to multiple distinct underlying objects;
   4. producing a canonical indicator object comprising one or more equivalence classes and one or more collision annotations;
   5. generating a collision proof committing to a support set of indicator records that justify the collision condition; and
   6. outputting a deconfliction artifact comprising the canonical indicator object, the collision proof, and a replay token.

## Independent Claim 2 — System
2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — Computer-Readable Medium
3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims
4. The method of claim 1, wherein the context attribute comprises at least one of observed timestamp, sighting location, associated malware family, associated actor, or associated infrastructure.
5. The method of claim 1, wherein graph neighborhood similarity is computed from an intelligence graph neighborhood within a hop budget.
6. The method of claim 1, wherein determining the collision condition comprises detecting multi-modal context clusters for the same indicator value.
7. The method of claim 1, wherein the collision proof is a minimal support set computed under a proof budget limiting evidence count or verification time.
8. The method of claim 1, further comprising outputting a safe action envelope specifying an allowed automated action set based on collision risk.
9. The method of claim 1, wherein the replay token comprises an index version, a policy version, and a time window identifier.
10. The method of claim 1, wherein the deconfliction artifact includes a cryptographic commitment to hashes of the support set via a Merkle root or Merkle proof.
11. The system of claim 2, further comprising a cache keyed by indicator value and replay token to reuse canonical indicator objects.
12. The method of claim 1, further comprising generating a counterfactual deconfliction that excludes a feed and estimating impact on collision rate.
13. The system of claim 2, further comprising a trusted execution environment configured to attest to deconfliction computation, wherein the deconfliction artifact includes an attestation quote.

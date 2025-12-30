# Claims — TRACER

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 receiving interaction events associated with a narrative cluster within a time window;
   1.2 constructing a temporal heterogeneous graph comprising nodes representing at least actors, content items, and referenced resources and edges representing interactions including at least authored, reshared, or linked relations, each edge associated with a timestamp;
   1.3 defining a constrained routing objective that assigns role scores to actors, the constrained routing objective including at least a temporal ordering constraint and a topic coherence constraint;
   1.4 computing role scores for a plurality of actors by routing influence credit through the temporal heterogeneous graph according to the constrained routing objective;
   1.5 selecting at least one actor-role assignment based on the role scores; and
   1.6 outputting a role certificate comprising the at least one actor-role assignment, a support subgraph identifying nodes or edges contributing to the actor-role assignment, and a replay token.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein the constrained routing objective comprises a constrained flow objective with capacity limits per edge or per actor.
5. The method of claim 1, wherein the temporal ordering constraint prevents routing influence credit along an edge whose timestamp precedes an upstream activation timestamp.
6. The method of claim 1, wherein the topic coherence constraint uses embedding similarity between content items and a narrative topic representation.
7. The method of claim 1, wherein selecting comprises assigning one of the roles originator, amplifier, bridge, or recycler.
8. The method of claim 1, wherein the support subgraph is selected under an explanation budget limiting a maximum number of nodes or edges.
9. The method of claim 1, further comprising enforcing an execution budget comprising at least one of maximum expansions, maximum runtime, or maximum memory.
10. The method of claim 1, wherein the replay token comprises a snapshot identifier, a schema version, an index version, and a seed value.
11. The method of claim 1, wherein the role certificate includes a cryptographic commitment to identifiers of the support subgraph via a Merkle root.
12. The system of claim 2, further comprising a trusted execution environment configured to generate an attestation quote bound to a digest of the role certificate.
13. The method of claim 1, further comprising generating a counterfactual role assignment by removing an actor node and computing a delta in the role scores.

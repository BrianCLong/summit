# Claims — RIT

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 receiving a transform registry comprising transform specifications, each transform specification mapping input entities to output entities;
   1.2 receiving a target result set comprising one or more entities or relations produced by execution of at least one transform;
   1.3 performing inverse planning over the transform registry to identify a candidate generating subplan comprising a subset of transforms and a corresponding minimal input set that can produce the target result set under a minimality constraint;
   1.4 generating an inversion artifact comprising the candidate generating subplan, the minimal input set, and a witness chain committing to at least the target result set; and
   1.5 outputting the inversion artifact with a replay token.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein inverse planning comprises searching a transform dependency graph using a budget limiting maximum search depth or maximum explored subplans.
5. The method of claim 1, wherein the minimality constraint comprises minimizing at least one of number of transforms, number of inputs, or estimated source calls.
6. The method of claim 1, further comprising validating the candidate generating subplan by replaying the candidate generating subplan under a determinism token.
7. The method of claim 1, wherein the witness chain includes hash commitments to intermediate entities produced by the candidate generating subplan.
8. The method of claim 1, wherein outputting comprises redacting inputs or intermediate entities under a disclosure constraint.
9. The method of claim 1, wherein the replay token comprises transform version identifiers and source version identifiers.
10. The system of claim 2, further comprising a cache keyed by a signature of the target result set to reuse inversion artifacts.
11. The method of claim 1, wherein the inversion artifact includes a cryptographic commitment to the candidate generating subplan via a Merkle root.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to inverse planning or replay validation.
13. The method of claim 1, further comprising producing counterfactual generating subplans and ranking them by likelihood.

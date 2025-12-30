# Claims — OMCP

## Independent Claim 1 — Method
1. A computer-implemented method comprising:
   1. receiving a prior ontology schema and an updated ontology schema;
   2. computing a schema delta comprising at least one of a type change, field change, or action signature change;
   3. compiling the schema delta into (i) a migration plan configured to transform stored data and (ii) a compatibility shim configured to map at least one prior client request into a corresponding updated request;
   4. verifying a compatibility condition for the compatibility shim with respect to at least one prior action signature;
   5. generating a compatibility proof object committing to the schema delta and the compatibility condition; and
   6. outputting a migration artifact comprising the migration plan, the compatibility shim, and the compatibility proof object with a replay token.

## Independent Claim 2 — System
2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — Computer-Readable Medium
3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims
4. The method of claim 1, wherein the compatibility condition comprises preserving type correctness for fields referenced by the prior action signature.
5. The method of claim 1, wherein compiling comprises generating a rewrite rule set for request mapping and validating rewrite rule termination.
6. The method of claim 1, further comprising performing shadow execution of the prior client request and the updated request and computing a deterministic diff of outputs.
7. The method of claim 1, wherein the compatibility proof object includes the deterministic diff or a bound on acceptable differences.
8. The method of claim 1, wherein the replay token comprises a snapshot identifier, a schema version pair, and a seed value.
9. The method of claim 1, further comprising emitting a breakage certificate when the compatibility condition fails, the breakage certificate identifying a minimal breaking change set.
10. The method of claim 1, wherein the migration artifact includes a witness chain committing to migration steps applied to stored data.
11. The system of claim 2, further comprising a cache keyed by schema delta hash to reuse compiled compatibility shims.
12. The method of claim 1, wherein verifying includes verifying policy invariants for the updated ontology schema under a policy engine.
13. The system of claim 2, further comprising a trusted execution environment configured to attest to compilation or verification, wherein the migration artifact includes an attestation quote.

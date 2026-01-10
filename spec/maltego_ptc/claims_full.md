# PTC Full Claim Set

## Independent Claims

1. A computer-implemented method comprising:
   1.1 receiving a transform specification for a transform operation, the transform specification comprising at least an effect declaration and a disclosure constraint;
   1.2 registering the transform specification in a transform registry;
   1.3 receiving a request to execute the transform operation on an input entity;
   1.4 verifying, prior to execution, that the effect declaration is authorized under a policy engine for a subject context and purpose;
   1.5 executing the transform operation to obtain an output entity set;
   1.6 generating a transform artifact comprising (i) a witness record committing to the input entity and the output entity set and (ii) a provenance record identifying at least one source contributing to the output entity set; and
   1.7 enforcing the disclosure constraint by redacting or bounding content in the transform artifact.

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein the effect declaration comprises at least one of READ, WRITE, or EXPORT.
5. The method of claim 1, wherein enforcing the disclosure constraint comprises enforcing an egress byte budget and a maximum number of output entities.
6. The method of claim 1, further comprising compiling a sequence of transform operations into a plan IR and optimizing the plan IR by batching calls to a common source.
7. The method of claim 1, further comprising caching the output entity set keyed by a transform signature and invalidating the cache upon a policy version change.
8. The method of claim 1, wherein generating the transform artifact comprises including a replay token binding the artifact to a time window and a source version.
9. The method of claim 1, wherein the provenance record comprises cryptographic commitments to source item hashes via a Merkle proof.
10. The system of claim 2, further comprising a witness ledger that hash chains witness records for tamper evidence.
11. The method of claim 1, wherein executing comprises running the transform operation within a sandbox that enforces a maximum execution time.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to execution of the transform operation.

## Definitions

- **Transform contract**: a typed declaration of effects, disclosure limits, and
  provenance guarantees.
- **Transform artifact**: proof-carrying output containing witness + provenance.

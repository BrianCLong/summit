# Claims — Source-Attested Transform Templates with License Metering (SATT)

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 receiving a transform template comprising executable transform logic and a metadata descriptor specifying at least a license policy and a disclosure constraint;
   1.2 validating an attestation for the transform template, the attestation binding a measurement hash of the executable transform logic to a signer identity;
   1.3 receiving a request to execute the transform template on an input entity;
   1.4 enforcing the license policy by metering at least one of executions, time, or returned bytes;
   1.5 executing the transform template to obtain transform outputs;
   1.6 enforcing the disclosure constraint by bounding or redacting content in the transform outputs; and
   1.7 outputting a transform artifact comprising the transform outputs and a license receipt committing to license consumption and a measurement hash.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein validating the attestation comprises verifying a signature over the measurement hash using a trusted signer list.
5. The method of claim 1, wherein metering comprises decrementing a license budget per tenant and rejecting execution when the license budget is exhausted.
6. The method of claim 1, wherein the transform artifact further comprises a witness record committing to the input entity and the transform outputs.
7. The method of claim 1, further comprising caching transform outputs keyed by a transform signature and invalidating the cache when the measurement hash changes.
8. The method of claim 1, wherein enforcing the disclosure constraint comprises enforcing an egress byte budget and a maximum number of output entities.
9. The system of claim 2, further comprising a rate limiter configured to enforce per-source concurrency constraints.
10. The method of claim 1, wherein the license receipt is stored in an append-only ledger and is hash chained for tamper evidence.
11. The system of claim 2, further comprising a trusted execution environment configured to attest to runtime execution of the transform template.
12. The method of claim 1, wherein the metadata descriptor includes a policy effect declaration and execution is authorized via a policy engine prior to execution.

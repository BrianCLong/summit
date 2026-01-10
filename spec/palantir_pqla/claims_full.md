# Claims — Policy-Qualified Local Analytics with Proof-of-Compliance (PQLA)

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 receiving an analytics request specifying an analytic operation over a dataset;
   1.2 verifying, using a policy engine, that the analytic operation is authorized for a subject context and a purpose, wherein authorization requires that outputs satisfy a disclosure constraint;
   1.3 executing the analytic operation within a sandbox environment co-located with the dataset to obtain an analytic output;
   1.4 transforming the analytic output to satisfy the disclosure constraint by applying at least one of aggregation, redaction, k-anonymity enforcement, or suppression;
   1.5 generating a compliance artifact comprising a commitment to the analytics request, a policy decision identifier, and a commitment to the transformed analytic output; and
   1.6 outputting the transformed analytic output together with the compliance artifact.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein the sandbox environment enforces a maximum execution time and a maximum memory limit.
5. The method of claim 1, wherein the disclosure constraint comprises an upper bound on egress bytes and a minimum group size for any reported statistic.
6. The method of claim 1, wherein executing comprises executing a graph analytic operation comprising at least one of community detection, shortest path, or centrality.
7. The method of claim 1, wherein the compliance artifact includes a determinism token comprising a snapshot identifier and a seed value.
8. The method of claim 1, wherein the compliance artifact is hash chained in an append-only ledger for tamper evidence.
9. The method of claim 1, further comprising generating a counterfactual output that simulates the analytic operation under a different disclosure constraint and reporting an information-loss metric.
10. The system of claim 2, further comprising a trusted execution environment configured to attest to execution of the sandbox environment, wherein the compliance artifact includes an attestation quote.
11. The method of claim 1, wherein verifying comprises rejecting analytics requests that include an export effect absent an export authorization token.
12. The method of claim 1, wherein transforming comprises adding calibrated noise to satisfy a differential privacy parameter.

# Claims — Query-Safe Distributed Recon with Canary Targets (QSDR)

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 receiving a recon request identifying one or more targets;
   1.2 selecting a set of recon modules to execute based on a policy constraint;
   1.3 generating one or more canary targets configured to detect disallowed recon behavior;
   1.4 executing at least one recon module on the one or more targets and the one or more canary targets while monitoring recon queries produced by the recon module;
   1.5 detecting disallowed recon behavior based on at least one of a canary trigger or a query-shape violation relative to an allowed query policy;
   1.6 in response to detecting disallowed recon behavior, halting execution of the recon module and generating a kill audit record committing to evidence supporting the halting; and
   1.7 outputting recon results obtained prior to halting together with the kill audit record.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein the canary targets comprise decoy domains, decoy accounts, or decoy email addresses instrumented to detect outbound contact attempts.
5. The method of claim 1, wherein the query-shape violation comprises detecting an active probe pattern, a rate-limit violation, or a disallowed endpoint class.
6. The method of claim 1, further comprising enforcing a per-target privacy budget limiting at least one of lookups, bytes, or retention time.
7. The method of claim 1, wherein halting comprises revoking a module execution token and quarantining the recon module pending review.
8. The method of claim 1, wherein the kill audit record includes a policy decision identifier and a replay token comprising a module version set and a time window.
9. The method of claim 1, wherein recon results are transformed into selective-disclosure outputs by aggregation or redaction prior to output.
10. The system of claim 2, further comprising a distributed scheduler that allocates module execution across workers and enforces per-worker concurrency limits.
11. The method of claim 1, wherein the kill audit record is stored in an append-only transparency log.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to monitoring and halting logic.

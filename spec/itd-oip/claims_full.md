# Trace Distillation to Optimized Investigation Plans (ITD-OIP) — Claims

## Independent Claims

1. **Method.** A computer-implemented method comprising:
   1. recording an interactive investigation trace comprising a sequence of transform operations, each transform operation including a transform identifier, input entities, and output entities;
   2. lowering the interactive investigation trace into an intermediate representation (IR) comprising an execution plan including a plurality of plan operations corresponding to the sequence of transform operations;
   3. optimizing the execution plan by applying one or more rewrite rules comprising at least one of deduplicating equivalent plan operations, batching calls to a common data source, reordering join operations, or pushing down filters;
   4. verifying the optimized execution plan against a policy constraint comprising an effect constraint and against a license constraint for at least one data source;
   5. executing the optimized execution plan to produce investigation results;
   6. generating a witness chain that includes, for each of at least a subset of the plurality of plan operations, a witness record committing to an input commitment, an output commitment, and a policy decision identifier; and
   7. outputting an investigation macro artifact comprising the optimized execution plan and the witness chain.

2. **System.** A system comprising: one or more processors; a trace recorder configured to record the interactive investigation trace; an IR compiler configured to lower the trace into the IR; a plan optimizer configured to apply the one or more rewrite rules; a verifier configured to verify the optimized execution plan against the policy constraint and the license constraint; and a witness store configured to store the witness chain and the investigation macro artifact.

3. **Computer-readable medium.** A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein deduplicating equivalent plan operations uses canonicalization of entity keys and memoization keyed by a transform signature.
5. The method of claim 1, wherein batching calls enforces rate-limit contracts and schedules batched calls to satisfy a latency budget.
6. The method of claim 1, wherein verifying comprises rejecting a plan operation that has an EXPORT effect absent a validated authorization token.
7. The method of claim 1, wherein the investigation macro artifact includes a replay token binding the optimized execution plan to data source versions and a graph snapshot identifier.
8. The system of claim 2, further comprising a cache configured to store transform outputs with a time-to-live and invalidation upon a policy version change.
9. The method of claim 1, wherein executing the optimized execution plan materializes the investigation results into a graph store as typed nodes and typed edges with provenance annotations.
10. The method of claim 1, further comprising computing and outputting a cost estimate for the optimized execution plan prior to executing the optimized execution plan.
11. The system of claim 2, wherein the plan optimizer learns at least one rewrite rule from a plurality of investigation traces.
12. The method of claim 1, wherein the witness chain is hash chained to provide tamper evidence.
13. The method of claim 1, wherein outputting the investigation macro artifact comprises producing a shareable macro in which entity identifiers are replaced by salted commitments for cross-tenant sharing.
14. The method of claim 1, wherein the verifier verifies compliance with a jurisdiction rule set based on at least one of target geolocation or data residency.

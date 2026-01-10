# ITD-OIP Claims (Draft)

## Independent Claims

1. **Method**: A computer-implemented method comprising:
   1. recording an interactive investigation trace comprising a sequence of transform
      operations, each transform operation including input entities and output entities;
   2. lowering the investigation trace into an intermediate representation (IR) comprising an
      execution plan;
   3. optimizing the execution plan by at least one of deduplicating equivalent transform
      operations, batching calls to a common data source, reordering joins, or pushing down
      filters;
   4. verifying the optimized execution plan against policy constraints including effect
      constraints and data source license constraints;
   5. executing the optimized execution plan to produce investigation results; and
   6. generating a witness chain committing to one or more transform operations and outputting
      an investigation macro artifact comprising the optimized execution plan and the witness
      chain.

2. **System**: A system comprising:
   1. a trace recorder configured to capture the investigation trace;
   2. an IR compiler configured to lower the trace into the IR;
   3. a plan optimizer configured to optimize the execution plan;
   4. a policy and license verifier configured to verify constraints; and
   5. a witness store configured to persist the witness chain and the investigation macro
      artifact.

## Dependent Claims

3. The method of claim 1, wherein deduplicating equivalent transform operations uses
   canonicalization of entity keys and memoization keyed by a transform signature.
4. The method of claim 1, wherein batching calls uses rate-limit contracts per data source and
   schedules calls to satisfy a p95 latency budget.
5. The method of claim 1, wherein verifying constraints includes rejecting transform operations
   with an export effect absent an authorization token.
6. The method of claim 1, wherein the investigation macro artifact includes a replay token
   binding the macro to data source versions and graph snapshot identifiers.
7. The system of claim 2, further comprising a cache configured to store transform outputs with
   time-to-live and invalidation upon policy version change.
8. The method of claim 1, wherein the witness chain includes commitments to transform inputs and
   outputs and a policy decision identifier per transform operation.
9. The method of claim 1, further comprising generating a cost estimate for the optimized
   execution plan and presenting the cost estimate in an audit interface.
10. The method of claim 1, wherein executing the optimized execution plan materializes results
    into a graph store as typed nodes and edges with provenance annotations.
11. The system of claim 2, wherein the plan optimizer learns rewrite rules from multiple
    investigation traces.
12. The method of claim 1, wherein the macro artifact is shareable across tenants only by
    replacing entity identifiers with salted commitments.
13. The system of claim 2, further comprising emitting a determinism token with the macro
    artifact to enable replay of optimized executions.

# Claims — JPC

## Independent claims

1. **Method**
   1.1 Receiving a workflow specification comprising a plurality of transform steps that produce intermediate entities.  
   1.2 Lowering the workflow specification into a plan intermediate representation (IR) comprising joins between intermediate entities.  
   1.3 Compiling the plan IR into a set of source queries that preserves the joins of the plan IR while minimizing a cost objective comprising at least one of number of source calls or egress bytes.  
   1.4 Executing the set of source queries to obtain query results.  
   1.5 Reconstructing joined outputs corresponding to the joins of the plan IR.  
   1.6 Outputting a workflow artifact comprising the joined outputs and a join preservation certificate committing to the plan IR and the set of source queries.

2. **System**
   A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

3. **CRM**
   A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent claims

4. The method of claim 1, wherein compiling comprises pushdown of filters into the set of source queries.
5. The method of claim 1, wherein minimizing comprises solving an optimization with constraints comprising rate limits and license limits per source.
6. The method of claim 1, further comprising caching source query results keyed by a query signature and invalidating upon source version change.
7. The method of claim 1, wherein the join preservation certificate includes a witness chain comprising commitments to intermediate entities.
8. The method of claim 1, wherein executing enforces an egress budget and redacts query results prior to reconstructing joined outputs.
9. The method of claim 1, wherein the join preservation certificate includes a replay token comprising a plan hash and a time window.
10. The system of claim 2, further comprising a verifier configured to verify the join preservation certificate without re-running the workflow.
11. The method of claim 1, wherein compiling groups source queries by endpoint to batch requests.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to compilation or execution.
13. The method of claim 1, wherein reconstructing joined outputs materializes a typed graph with provenance annotations.

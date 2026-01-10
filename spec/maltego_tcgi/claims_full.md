# Claims — TCGI

## Independent Claim 1 — Method
1. A computer-implemented method comprising:
   1. receiving a plurality of investigation session traces, each investigation session trace comprising a transform graph of transform operations and intermediate entities;
   2. inducing, from the plurality of investigation session traces, a transform graph grammar comprising production rules that generate transform graphs;
   3. receiving a macro request specifying an objective comprising at least one of coverage, precision, latency, or cost;
   4. generating, using the transform graph grammar, a candidate macro transform graph that satisfies a constraint comprising a policy effect constraint or a license constraint;
   5. optimizing the candidate macro transform graph by batching, deduplication, or caching transformations; and
   6. outputting a macro artifact comprising the candidate macro transform graph, a justification mapping to at least one production rule, and a replay token.

## Independent Claim 2 — System
2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — Computer-Readable Medium
3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims
4. The method of claim 1, wherein inducing comprises mining frequent subgraphs from the investigation session traces to form production rules.
5. The method of claim 1, wherein the policy effect constraint comprises at least one of READ, WRITE, or EXPORT and excludes EXPORT absent an authorization token.
6. The method of claim 1, wherein the license constraint comprises a per-source usage limit and the candidate macro transform graph is generated to satisfy the per-source usage limit.
7. The method of claim 1, wherein optimizing comprises grouping transform operations by data source endpoint for batch execution under a rate limit.
8. The method of claim 1, further comprising generating an expected cost estimate for the candidate macro transform graph and outputting the expected cost estimate in the macro artifact.
9. The method of claim 1, wherein the replay token comprises a grammar version identifier and a source version set.
10. The method of claim 1, wherein the macro artifact includes a witness chain committing to macro execution inputs and outputs.
11. The system of claim 2, further comprising a cache keyed by macro signature and policy version to reuse generated macros.
12. The method of claim 1, further comprising generating counterfactual macros and ranking the counterfactual macros by objective value.
13. The system of claim 2, further comprising a trusted execution environment configured to attest to macro generation or optimization.

# JPC Source Query Minimization

## Objective

Minimize the number of source calls and egress bytes while preserving join
semantics, subject to rate limits and license constraints.

## Techniques

- Filter pushdown into source queries.
- Query batching by endpoint.
- Cache reuse keyed by query signature and source version.

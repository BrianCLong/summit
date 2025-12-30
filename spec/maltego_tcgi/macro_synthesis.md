# Macro Synthesis and Optimization

## Generation
- Accept macro requests with objectives (coverage, precision, latency, cost) and constraints (policy effects, license limits).
- Use induced grammar to generate candidate macro transform graphs satisfying constraints.

## Optimization
- Batch operations by data source endpoint under rate limits.
- Deduplicate and cache transformations to minimize cost and latency.
- Compute expected cost estimate and attach to macro artifact.
- Generate counterfactual macros and rank by objective value.

## Compliance
- Enforce policy effect constraints (e.g., forbid EXPORT without authorization token).
- Enforce per-source license usage limits.
- Produce witness chain over macro execution inputs/outputs and store in transparency log.

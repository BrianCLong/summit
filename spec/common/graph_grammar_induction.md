# Graph Grammar Induction Primitive

Provides the shared mechanism for learning and applying transform graph grammars for macro generation.

## Inputs
- Investigation session traces represented as transform graphs (operations, entities, edges).
- Policy and license constraints defining permitted effects and usage limits.
- Macro objectives (coverage, precision, latency, cost).

## Processing
- Frequent subgraph mining to derive production rules.
- Grammar induction with rule weighting from historical success metrics.
- Constraint-aware macro synthesis honoring effect constraints (READ/WRITE/EXPORT) and license limits.
- Optimization via batching, deduplication, caching grouped by data source endpoints under rate limits.
- Counterfactual macro generation and ranking.

## Outputs
- Candidate macro transform graphs with justifications to production rules.
- Expected cost estimates and policy compliance flags.
- Witness chains over macro execution inputs/outputs.
- Replay tokens with grammar version and source version set.

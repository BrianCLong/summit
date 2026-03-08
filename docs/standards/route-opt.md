# Route Optimization Standards (ROAM)

## Import/Export Contract

| Import | Export | Notes |
| --- | --- | --- |
| JSON input | `agents/route_opt/schemas/route_plan.schema.json` | Deterministic schema contract |
| CSV dataset (converted upstream) | `artifacts/route_plan/report.json` | Machine-consumable, reproducible |
| Solver API (deterministic tools) | `artifacts/route_plan/metrics.json` | Benchmarkable |

## Non-goals

- Real-time routing
- Probabilistic heuristics
- UI visualization

## Determinism Rules

- Sort all stop inputs by `id` before any computation.
- Stable JSON serialization (`sort_keys=True`) for hash computation.
- Deny-by-default if schema validation fails.
- Final solve path must not use stochastic branching.

## Feature Flag

- `ROUTE_OPT_AGENT_ENABLED=false` by default.

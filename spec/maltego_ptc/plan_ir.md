# Transform Plan IR

## Purpose

Defines an intermediate representation used to optimize transform execution.

## IR Elements

- **TransformNode**: reference to registered transform spec.
- **InputBinding**: entity bindings and parameters.
- **Constraints**: disclosure budgets and policy scope.
- **ExecutionHints**: batching, caching, and timeouts.

## Optimization Rules

- Batch calls to the same source when contracts are compatible.
- Deduplicate identical transform calls using cache keys.
- Respect disclosure budgets when combining outputs.

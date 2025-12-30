# Optimizer Rules

- Deduplicate equivalent transforms via canonical transform signatures and memoized outputs.
- Batch calls per data source respecting rate-limit and p95 latency budgets.
- Reorder joins to reduce intermediate size and push down filters.
- Learn rewrite rules from historical traces to improve execution efficiency.

# Performance & Cost Budgets

## Initial Budgets

| Metric | Budget |
| :--- | :--- |
| Planner latency | p95 < 20s |
| Splitter latency | p95 < 5s |
| Per-child PR generation | p95 < 12m |
| Architecture review | p95 < 60s |
| Policy review | p95 < 60s |
| Self-heal attempt | max 1 per failing check class |
| Memory for local CLI path | < 1.5 GB |
| Changed files per child PR | soft cap 20, hard cap 40 |
| Net LOC delta per child PR | soft cap 600, hard cap 1200 |

## CI Enforcement
- Fail if fanout exceeds configured PR count.
- Fail if changed files/LOC exceed policy without override label.
- Fail if expected artifact set is incomplete.
- Emit trendlines from `metrics.json`.

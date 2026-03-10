# Behavior Forecasting Platform Standard

| Input / Output | Summit Mapping | Notes |
| :--- | :--- | :--- |
| Agent run traces | artifacts/ + benchmark fixtures | deterministic replay first |
| Tool-call/event stream | temporal event schema | ordered, typed, replayable |
| Policy definitions | policy engine / OPA-adjacent checks | deny-by-default |
| Scenario definitions | benchmark cases | versioned |
| Forecast outputs | report.json / metrics.json / stamp.json | machine-verifiable |
| Evidence bundle | existing evidence workflows | validate schema before merge |

## Non-goals

- Full training framework for foundation models.
- Real-time autonomous intervention in production agents.
- Human replacement for safety review.
- Claims of formal verification where only empirical forecasting exists.

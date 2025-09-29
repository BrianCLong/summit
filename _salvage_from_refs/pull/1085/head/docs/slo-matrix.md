# SLO Matrix (Starter)

This starter SLO matrix captures latency, quality, and cost targets per expert, plus a monthly error budget for alerting and release gating.

| Expert          | p95 Latency | p99 Latency | Success@k | Cost cap/op | Error budget/mo |
| --------------- | ----------: | ----------: | ---------: | ----------: | --------------: |
| graph_ops       |      800 ms |         2 s |     ≥0.9@3 |      ≤$0.02 |              1% |
| rag_retrieval   |       1.2 s |         3 s |    ≥0.85@3 |      ≤$0.05 |              1% |
| osint_analysis  |       2.5 s |         6 s |     ≥0.8@5 |      ≤$0.08 |              2% |

Notes:
- Success@k: task-type specific acceptance rate within top-k candidates.
- Cost cap/op: blended infra + model spend per successful operation.
- Error budget: percent of requests permitted to miss SLO in a 30-day window.

See `router/qos.yaml` for traffic classes and admission control defaults.

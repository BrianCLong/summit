# MCB Claims (Method, System, CRM)

## Independent claims

1. Method: receive metric contract with tasks, scoring, thresholds; retrieve signals and labels; execute scoring pipeline; generate benchmark binder with results, confidence intervals, backtests; output binder with replay token.
2. System: processors and memory executing the method above.
3. Computer-readable medium: instructions to perform the method above.

## Dependent claims

4. Tasks include detection, attribution, prioritization, or forecasting over an intelligence graph.
5. Confidence intervals computed via bootstrap or Bayesian posterior intervals.
6. Drift detector identifies feed changes and emits metric-contract violation alerts.
7. Benchmark binder includes minimal support set for at least one metric under a proof budget.
8. Counterfactual benchmark binders exclude a selected feed and report metric deltas.
9. Replay token comprises a time window identifier and index version set.
10. Benchmark binder includes cryptographic commitments to labeled outcomes via a Merkle proof.
11. System caches keyed by metric contract hash and replay token.
12. Metric contract includes quarterly reporting checkpoints aligned to performance goals.
13. System includes a trusted execution environment configured to attest to scoring execution.
14. Export evaluator-facing summaries formatted for periodic program reviews.

# Intelligence Lab Recipe Catalog

| Recipe ID                      | Purpose                                                               | Dataset(s)                                                              | Primary Metrics             | Maturity     |
| ------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------- | ------------ |
| COMPETITIVE_LANDSCAPE_V1       | Baseline competitive landscape mapping using curated signals.         | GOLDEN/datasets/sum_news.jsonl, GOLDEN/datasets/qa_short.jsonl          | Graph coverage, alert yield | Baseline     |
| INFLUENCE_NETWORK_DISCOVERY_V1 | Discover influence networks from narrative echoes and entity overlap. | GOLDEN/datasets/safety_pii.jsonl, GOLDEN/datasets/copilot_summary.jsonl | Precision proxy, latency    | Experimental |

## Success criteria snapshots

- **COMPETITIVE_LANDSCAPE_V1:** Captures at least 70% of target entities with actionable cluster
  signals, while maintaining alert yield above baseline.
- **INFLUENCE_NETWORK_DISCOVERY_V1:** Surfaces coordinated narrative clusters with acceptable
  precision proxy and latency under budget.

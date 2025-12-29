# R3 Disinformation Network Mapping Demo Fixture (Jan 6-20, 2026)

This fixture locks the canonical scenario, dashboard naming, validation partner, and LAC gate scope for the Jan 6-20, 2026 sprint demo.

## Canonical scenario & data

- **Case**: `r3-disinfo-baltic-shield` — a Baltic maritime fuel-price distortion campaign with coordinated amplification across X/Telegram/blogs.
- **Fixture**: `case.json` captures seeds, propagation graph, truth anchors, and adjudicated ground truth for evaluation.
- **Usage**: Load into the tri-pane UI as the R3 runbook input. The graph is small enough for deterministic replay but contains cross-platform edges for Graph-XAI counterfactuals, saliency, and path rationales.

## Grafana layout convention

- **Folder**: `intelgraph-slo/graph-xai` (matches existing `intelgraph-*` ops folders).
- **Dashboards**:
  - `ig-slo-graphq-p95` — p95 graph query latency (UID suggestion: `ig-gql-p95`).
  - `ig-slo-ingest-lag` — ingestion lag/offset (UID suggestion: `ig-ingest-lag`).
- **Panels**: prefer panel titles matching metric names (`graph_query_p95_ms`, `ingest_lag_seconds`) to align with sloth SLO specs.

## Portable evidence bundle validation

- **Partner target**: `intelgraph-consumer-alpha` (internal consumer with existing prov-ledger keys) to validate the first portable evidence bundle and proof-carrying query (PCQ) export.
- **Expectation**: runbook export must include prov-ledger hash chain + PCQ proof and pass verification using this fixture's truth anchors.

## License/Authority Compiler (LAC) gate

- **Enforcement**: hard-enforce in **stage**; enable in **dev** behind `LAC_ENFORCE=true` to unblock earlier testing without blocking local spikes.
- **Reason**: stage enforcement protects demo integrity while allowing dev iteration on Graph-XAI/PCQ wiring.

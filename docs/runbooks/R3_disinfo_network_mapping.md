# R3. Disinformation Network Mapping

**Purpose:** map narrative propagation and influence paths.
**Steps:** seed narratives → burst detection → influence paths → cadence signatures → COAs.
**KPIs:** coverage ≥ 0.8 on seed set; false positives < 0.1.

## Sprint Jan 6-20, 2026 demo anchors

- **Canonical fixture**: `test-data/r3-disinfo-demo/case.json` (Baltic maritime fuel-price distortion) — use as the locked seed for R3 Graph-XAI + PCQ + prov-ledger walkthroughs.
- **SLO dashboards**: create Grafana folder `intelgraph-slo/graph-xai` with dashboards `ig-slo-graphq-p95` (UID `ig-gql-p95`) and `ig-slo-ingest-lag` (UID `ig-ingest-lag`); panel names should mirror metric names (`graph_query_p95_ms`, `ingest_lag_seconds`).
- **Portable evidence bundle validation**: target `intelgraph-consumer-alpha` for the first PCQ + prov-ledger verification of the R3 export; use the fixture truth anchors to confirm proof chains.
- **LAC enforcement**: enforce in **stage**; enable in **dev** behind `LAC_ENFORCE=true` to allow local iteration without blocking spikes.

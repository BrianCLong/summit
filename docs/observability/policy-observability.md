# Policy decisions & receipts observability

The new Grafana dashboards in `grafana/dashboards` provide live coverage of policy evaluation health and the downstream receipt/anchoring pipeline.

## Dashboards

- **Policy Decisions (`policy-decisions`)**
  - Throughput stat driven by `sum(rate(policy_decisions_total[$__rate_interval]))` so spikes in enforcement load are obvious.
  - p95 decision latency panel: `histogram_quantile(0.95, sum by (le) (rate(policy_decision_latency_ms_bucket[$__rate_interval])))`, filterable by cache state to show Redis effectiveness.
  - Cache hit ratio bargauge derived from `_count` series to track how many decisions bypass the cache.
  - Deny ratio time series slices by tenant/action to catch over-blocking releases quickly.
  - Guardrail violations overlay purpose, reason, and selector-expansion counters to highlight policy hygiene issues.
  - A top denies table surfaces the noisiest tenants/actions so playbooks can start with the worst offenders.

- **Policy Receipts (`policy-receipts`)**
  - Receipt emission stat from `provenance_writes_total` and top-tenant table for volume leaders.
  - Anchoring success rate compares `evidence_registrations_total` to writes to catch ledger drift.
  - Connector latency (p95) pulled from `connector_latency_ms_bucket` for provenance/ledger/receipt connectors to watch for regressions.
  - Export blockers bargauge contrasts `export_blocks_total` and `export_requests_total` so export gating is visible.

## SLO hints

- **Decision latency p95:** keep under **250 ms**; alert `PolicyDecisionLatencyP95High` pages after 10 minutes above the threshold.
- **Deny ratio:** target **<10%** across tenants; `PolicyDenyRateSpike` warns when exceeded for 10 minutes.
- **Cache hit rate:** stay **>70%**; `PolicyCacheMissSurge` fires when misses exceed 30% for 15 minutes.
- **Receipt anchoring:** at least one `evidence_registrations_total` increment every **15 minutes**; `ReceiptAnchoringStalled` pages when none are seen.
- **Receipt/export blockers:** any `export_blocks_total` increase over **5 minutes** triggers `ReceiptBlockersDetected` so blocked receipts are triaged immediately.

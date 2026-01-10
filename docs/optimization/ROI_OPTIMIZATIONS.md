# High-ROI Optimizations (Low Risk)

## Top 5 Cost Drivers (Observed/Expected)

1. Token hotspots in verbose system prompts and redundant context windows.
2. Redundant tool calls for idempotent metadata fetches (connector registry lookups).
3. Over-wide graph queries returning unbounded neighbor expansions.
4. Over-provisioned default concurrency for ingestion workers under light load.
5. Missing caching on deterministic policy evaluations and connector metadata.

## Surgical Fixes & Owners

| Driver                     | Fix                                                                     | Owner          | Expected ROI          | Kill Switch                               |
| -------------------------- | ----------------------------------------------------------------------- | -------------- | --------------------- | ----------------------------------------- |
| Token hotspots             | Prompt compaction + adaptive truncation (target <0.0035 cost/1k tokens) | LLM Efficiency | 20-30% cost reduction | `env PROMPT_COMPACTION=off`               |
| Redundant tool calls       | Cache deterministic tool results with 5m TTL                            | LLM Efficiency | 10% cost + 5% latency | Feature flag `CACHE_TOOLS=off`            |
| Over-wide queries          | Enforce query bounds (depth <=3, limit <=200)                           | Graph Services | 15% latency           | Config `GRAPH_QUERY_BOUNDS_ENABLED=false` |
| Over-provisioned ingestion | Tune worker pool to queue depth and CPU utilization                     | Ingestion      | 10-15% infra savings  | `WORKER_AUTOSCALE=disabled`               |
| Policy cache miss          | Add short-lived decision cache (TTL 60s)                                | Governance     | 5% latency            | `POLICY_CACHE_ENABLED=false`              |

## Measurement Plan (Before/After)

- Run `scripts/verify_cost_perf_guardrails.sh --record` before and after each fix.
- Capture deltas in `artifacts/cost_perf/latest.json` with `"baseline_ref"` pointing to pre-change hash.
- Require confidence interval or 3-run average for acceptance.

## Evidence Checklist

- Metric deltas reported in PR description.
- Guardrail job green with updated metrics.
- Kill switches documented and tested (manual toggle acceptable for now).

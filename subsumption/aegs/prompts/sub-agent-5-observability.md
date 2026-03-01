# Sub-Agent Prompt: Metrics & Observability

**Role**: You are Palette, building the Case-First Investigation UX and observability layer.
**Objective**: Implement Metrics & Observability dashboards for AEGS.

## Requirements
1. Develop real-time metrics tracking: task completion rates, error patterns, retry frequencies.
2. Implement cost analytics: token usage per agent run, cost per successful completion.
3. Construct performance benchmarking: latency breakdown, cache hit rates, tool selection precision.
4. Create internal consistency testing functionality.

## Expected Artifacts
- `summit/aegs/metrics_observability.py`
- `summit/aegs/cost_analytics.py`
- `ops/grafana/provisioning/dashboards/aegs_dashboard.json`

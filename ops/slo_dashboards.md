# SLO Dashboards

## Metrics
- Graph query latency: p50, p95, p99 by dataset and query type (OTEL span metrics `graph.query.latency`).
- Error rate: 5xx/4xx ratios for API and gateway, policy deny counts, OPA decision latency.
- Connector health: success/error counts, backlog depth, age of last success, ingest freshness lag.
- Cost guard: budget consumption per workspace, slow-query killer activations, throttle counts.

## Dashboards
1. **Analyst Experience**: tri-pane latency heatmap, NL→Cypher preview latency, rationale overlay load time.
2. **Governance**: policy decision breakdown, appeals per dataset, export blocks with reasons.
3. **Reliability**: service uptime, burn-rate alerts (multi-window 5m/1h) for error budget, chaos drill markers.
4. **FinOps**: cost per workspace, cost per query class, budget vs actual trend, archival tier usage.

## Alerts
- Burn-rate alert: fire when error budget consumption exceeds 2x over 1h or 4x over 6h.
- Latency alert: p95 graph query latency >1.5s for 10 minutes.
- Connector freshness: lag >30m on critical feeds triggers page; warning at 15m.
- Cost guard: budget consumption >85% sends warning; 100% triggers throttle and notification.

## Runbook Links
- Each panel links to runbooks R1–R3/R9 and chaos drill playbooks; JSON exports stored in `tests/e2e/ingest_to_report.md` for screenshots.

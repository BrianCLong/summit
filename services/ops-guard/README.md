# Ops Guard

Sidecar-style service that enforces budgets for graph queries, exports OTEL/Prometheus telemetry, and runs scheduled chaos drills linked to incident runbooks.

## Endpoints
- `GET /metrics` Prometheus text format with latency heatmaps, saturation, and cost-per-insight histograms.
- `POST /guard/query` Budget-aware admission with slow-query killer and cost-governor recommendations. Body accepts `planCost`, `estimatedMs`, `expectedInsights`, `safeConcurrency`, `strategy`, and optional `queryId`.
- `POST /governor/suggest` Returns cheaper equivalent plan suggestions without executing a query.
- `POST /chaos/run` Runs a canned drill and emits follow-up tasks/lessons.
- `GET /chaos/tasks` Aggregated follow-up tasks from prior drills.
- `GET /chaos/slo-trend` Rolling SLO deltas across drills.

## Running locally
```
npm install
npm run start
```

Environment knobs:
- `PORT` (default `4100`)
- `LATENCY_BUDGET_MS` (default `1500`)
- `COST_BUDGET` (default `100`)
- `SLOW_QUERY_KILL_MS` (default `1200`)
- `CHAOS_INTERVAL_MS` (default 5 minutes)

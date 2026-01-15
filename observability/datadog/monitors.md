# Tri-Pane Sync Datadog Monitors

## Assumptions
- Metrics are in Datadog as:
  - `tripane.sync.divergence` (count)
  - `tripane.sync.divergence_delta_ms` (distribution)
  - `tripane.pane.refresh_latency_ms` (distribution)
  - `tripane.stale_response_discard` (count)
  - `tripane.syncing.duration_ms` (distribution)
  - `tripane.syncing.shown` (count)
  - `tripane.pane.refresh_error` (count)
- Tags: `env:prod`, `pane:graph|map|timeline`, `tenant_id:*`, `build_version:*`, `granularity:*`, `tz_mode:*`

## 1) Monitor: Divergence rate (page)

**Query (metric monitor):**
```
sum(last_5m):sum:tripane.sync.divergence{env:prod} > 3
```

**Message template:**
```text
🚨 P0: Tri-pane divergence detected (env: {{env.name}})

- Divergence count (5m): {{value}}
- Top slices: pane, build_version, granularity, tz_mode
- Suggested actions:
  1) Check recent deploy markers / build_version spikes
  2) Validate repro: rapid brush A→B + granularity toggle
  3) Mitigate: disable flag {{#is_alert}}[flagName]{{/is_alert}} or rollback build

Dashboards:
- Sync health: <GRAFANA_OR_DD_DASH_LINK>
Runbook:
- <RUNBOOK_LINK>

@oncall @eng-tri-pane
```

## 2) Monitor: Divergence magnitude p95 > 30s (page)

**Query (distribution / percentile):**
```
p95(last_10m):tripane.sync.divergence_delta_ms{env:prod} > 30000
```

## 3) Monitor: Pane refresh latency p95 degraded (ticket/slack)

**Query:**
```
p95(last_10m):tripane.pane.refresh_latency_ms{env:prod} > 2000
```

**Multi-alert by:** `pane`

**Message snippet add-on:**
```text
Pane: {{pane.name}}
Build: {{build_version.name}}
```

## 4) Monitor: Syncing shown spike (slack/ticket)

**Query:**
```
sum(last_10m):sum:tripane.syncing.shown{env:prod} > 50
```

*Alternative (Anomaly):*
```
anomalies(sum:tripane.syncing.shown{env:prod}.rollup(sum, 60), 'basic', 3, direction='both', alert_window='last_10m', interval=60, count_default_zero='true')
```

## 5) Monitor: Pane refresh errors elevated (slack/ticket)

**Query:**
```
sum(last_5m):sum:tripane.pane.refresh_error{env:prod} > 30
```

*Note: Multi-alert by `pane,error_code` is recommended.*

## Alert message “auto-slicing” trick
Set monitors as **multi-alert** grouped by:
- `pane`
- `build_version`
- optionally `granularity` or `tz_mode`

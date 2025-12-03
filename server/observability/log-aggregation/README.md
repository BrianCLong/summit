# Log Aggregation Stack

This package wires structured app logs into Fluent Bit and Logstash so they land in Elastic/Loki/S3 with retention and alerting baked in.

## Agents
- **Fluent Bit** tails `server/logs/*.log`, parses JSON, enriches with Kubernetes metadata, and forwards to Logstash, Elasticsearch, Loki, and S3 (see `fluent-bit.conf`).
- **Logstash** receives forwarded events, normalizes timestamps, redacts secrets, and fans out to Elastic, Loki, and S3 cold storage (see `logstash/pipeline.conf`).

## Application emitters
- The API emits structured Pino logs to `server/logs/app-structured.log` and `server/logs/app-error.log` with correlation/trace context.
- Log events are mirrored to an in-process event bus for live streaming and alert evaluation.

## Streaming API
- `GET /observability/logs/stream` — Server-Sent Events streaming live logs and alerts.
- `GET /observability/logs/recent?limit=200` — Fetches the latest buffered log events.
- `GET /observability/logs/alerts` — Exposes the active alert rules and the last triggered alerts.
- The SSE stream emits `data: { type: 'log' | 'alert', ... }` frames plus `:heartbeat` comments every 15s to keep proxies alive.

## Alerting
- Default rules detect error bursts, HTTP 5xx spikes, and authentication failures (tunable via code).
- Alerts are emitted on the same SSE channel for easy dashboard wiring.

## Retention
- Logs are compressed after 3 days, retained for 30 days, and capped at 2 GiB locally (override with env vars `LOG_RETENTION_DAYS`, `LOG_COMPRESS_AFTER_DAYS`, `LOG_TOTAL_SIZE_MB`).
- S3 output already stores compressed JSON lines with a hierarchical key prefix for lifecycle policies.

### Key environment flags

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOG_LEVEL` | `info` | Minimum level written to files/STDOUT |
| `LOG_DIR` | `<repo>/server/logs` | Local directory for structured log files |
| `LOG_RETENTION_DAYS` | `30` | Age in days before local logs are deleted |
| `LOG_COMPRESS_AFTER_DAYS` | `3` | Age in days before `.log` files are gzipped |
| `LOG_TOTAL_SIZE_MB` | `2048` | Cap on total local log footprint before oldest files are trimmed |


## Deploy
1. Mount `server/logs` into the Fluent Bit daemonset or sidecar; pass connection env vars for Elastic/Loki/S3.
2. Deploy Logstash with `logstash/pipeline.conf` mounted as the pipeline configuration.
3. Wire Grafana/Elastic alerting to the `summit-logs-*` index or consume SSE endpoint for bespoke alerting.

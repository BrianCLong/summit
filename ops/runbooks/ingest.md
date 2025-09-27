# Ingest Pipeline Runbook

**Primary Dashboard:** Grafana → `Ingest Pipeline`

## Trigger Conditions
- `IngestSLOFastBurn` page or backlog warning ticket.
- CI/CD synthetic ingest test failure after deploy.

## Immediate Actions
1. Acknowledge alert and notify data engineering stakeholder channel.
2. Verify queue depth trend on dashboard; capture snapshot.
3. If backlog >8k events, enable rate limiting by setting feature flag `ingest.dynamicBackpressure=true`.

## Diagnostics
- Prometheus query `sum by (status) (rate(ingest_events_total{service="ingest"}[5m]))` to find failing stages.
- Check Loki logs `{service="ingest",level="error"}` filtered by `pipelineStage` label.
- Compare Kafka lag metrics `kafka_consumer_group_lag{group="ingest"}` for upstream impact.

## Mitigations
- Restart impacted worker via Helm `helm rollback ingest <previous release>` if canary release regressed.
- Scale ingestion workers: `kubectl scale deploy/ingest --replicas=<n>` after verifying DB headroom.
- Purge poison messages by moving DLQ events to quarantine bucket.

## Post-Incident
- Annotate Grafana dashboard with incident ID.
- File follow-up Jira with remediation steps and attach metrics export.

# Real-Time Collaboration Monitoring Guide

This guide explains how to observe Summit's collaborative graph editing features with the new OpenTelemetry instrumentation, Grafana dashboards, and Prometheus alerts introduced for Workstream 106.

## OpenTelemetry Instrumentation

The collaboration service now emits dedicated metrics through the existing `IntelGraphMetrics` singleton. Key counters and histograms include:

- `maestro_collaboration_active_sessions` (UpDownCounter) — active investigations with at least one participant.
- `maestro_collaboration_active_users` (UpDownCounter) — total real-time collaborators across investigations.
- `maestro_collaboration_concurrent_users` (Histogram) — snapshot of concurrent editors when participation changes.
- `maestro_collaboration_edit_latency_seconds` (Histogram) — submission-to-resolution latency for edits.
- `maestro_collaboration_edit_conflicts_total` (Counter) — conflicts detected within the five-minute contention window.
- `maestro_collaboration_events_total` (Counter) — lifecycle events such as joins, leaves, comments, and presence updates.

These metrics are updated on join/leave flows, edit submission and resolution, conflict detection, timed-out sessions, and comment activity. They surface automatically through the OTEL Prometheus exporter.

## Grafana Dashboard

Import `server/grafana/collaboration-observability.json` into Grafana to visualize real-time health. The dashboard tracks:

- Current collaboration sessions and user counts (stat panels).
- p50/p95 edit latency derived from the OTEL histogram.
- Conflict rate per investigation.
- Aggregate event throughput segmented by event type.

The default time range is 6 hours with a 30s refresh, making it suitable for live operations dashboards.

## Prometheus Alerts

New alerting rules (`server/infrastructure/monitoring/prometheus/alerts.yml`) raise warnings for bottlenecks:

- **CollaborationLatencyHigh** — triggers when 95th percentile edit latency stays above 3 seconds for five minutes.
- **CollaborationConflictSpike** — warns when conflict rates exceed two per second across investigations.
- **CollaborationSessionSaturation** — indicates sustained load above 60 concurrent collaborators for 10 minutes.

Deploy the updated rules to Alertmanager to receive notifications via existing routing policies.

## Verification Checklist

1. Deploy the backend and ensure OTEL exporters are configured (OTLP or Prometheus scrape).
2. Exercise collaborative editing (joins, edits, conflicts) and confirm metrics appear at `/metrics` or the OTLP collector.
3. Import the Grafana dashboard and validate panels populate with live data.
4. Simulate load (e.g., by replaying edits) to confirm alerts fire under expected thresholds.

Following these steps provides end-to-end visibility into Summit's collaborative graph editing workloads.

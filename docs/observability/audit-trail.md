# Audit Trail Ingestion and Governance

## Ingestion pipeline

- Source events from API gateway, authz-gateway, workflow engine, and agent runtime emit `audit_events_ingested_total` and `audit_event_bytes_total` to OTLP.
- OpenTelemetry Collector forwards logs to Loki and traces to Tempo with correlation IDs attached via `correlation.id` attribute.
- Vector/Fluent Bit DaemonSet enriches Kubernetes logs with pod metadata and correlation IDs before shipping to the centralized log store.

## Storage policies

- Raw audit logs retained for **30 days** in Loki with compressed chunks.
- Canonical audit records mirrored to object storage with **90-day** retention and bucket-level immutability (WORM).
- PII handling: redact `user.email`, `ip` fields via Vector VRL before egress; masking policy aligns with `docs/governance/PII_TAGS.md`.
- Access control: read restricted to `auditors` and `security` roles via Grafana/Tempo auth; write limited to telemetry service accounts.

## Dashboards

- **Audit Event Volume:** `rate(audit_events_ingested_total[5m])` by service; highlights ingestion gaps.
- **Actor Activity:** top actors by action and tenant using Loki log label queries.
- **Data Access Trails:** traces filtered by `correlation.id` to reconstruct read/write paths across the mesh.

## Validation

- Synthetic audit event replay via `make audit-smoke` exercises gateway, API, and agent surfaces.
- Alert `AuditTrailIngestionStall` in `infra/observability/prometheus-rules.yaml` fires on stalled ingestion.
- Weekly export checksum verification of object storage buckets; discrepancies trigger incident runbook `docs/observability/runbooks/audit-integrity.md`.

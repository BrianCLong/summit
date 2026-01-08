# Audit Integrity Runbook

## Purpose

Restore audit trail ingestion and storage when gaps, corruption, or PII handling regressions are detected.

## Preconditions

- Pager alert `AuditTrailIngestionStall` or checksum mismatch from weekly export.
- Access to observability cluster kubeconfig and S3/object storage credentials (read-only).

## Steps

1. **Triage ingestion path**
   - Check collector health: `kubectl -n observability logs deploy/otel-collector | tail -n 50` for exporter errors.
   - Validate pipeline: ensure `audit_events_ingested_total` increasing via Prometheus query `rate(audit_events_ingested_total[5m])`.
   - Verify Vector DaemonSet health: `kubectl -n observability get pods -l app.kubernetes.io/name=vector`.
2. **Correlation verification**
   - Choose impacted `correlation.id` from alert; query Loki `|= "correlation_id=..."` and Tempo trace search.
   - If missing, restart sidecar injection on affected namespace to reapply headers.
3. **Storage integrity**
   - Run checksum job: `make audit-checksum-verify` to compare object storage manifests vs. bucket contents.
   - For mismatches, mark affected objects as quarantined and rehydrate from Loki via `make audit-replay`.
4. **PII guardrails**
   - Inspect Vector VRL pipeline for redaction regressions; redeploy from `infra/observability/vector-pipeline.yaml` if needed.
   - Run spot-check: `kubectl logs job/audit-replay | grep -E "email|ip"` should return no raw values.
5. **Recovery and validation**
   - Backfill missing audit events by replaying queue: `make audit-replay SINCEDB_TIME=<rfc3339>`.
   - Confirm dashboards recovered: Grafana > Audit Event Volume panel returns non-zero values.
   - Close incident only after 2x successive 15-minute windows show healthy ingestion and checksums match.

## Communications

- Incident commander: Security on-call.
- Postmortem required within 48h; attach Grafana snapshots and checksum report artifacts.

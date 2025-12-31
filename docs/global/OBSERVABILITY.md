# Global Observability & Audit

## Cross-Region Views

- **Dashboards**: Unified views showing request volume by region/tenant, failover events, replication lag, and policy cache health.
- **Events**: Standardized events (`failover.*`, `residency.*`, `policy.cache.*`, `replication.*`) emitted with region and control-plane version tags.
- **Lag tracking**: Replication lag exported per stream/topic with P50/P95/P99 and alert thresholds.

## Audit & Provenance

- **Provenance fields**: tenant, region, residency decision, policy version, control-plane commit index, causal predecessor, signature.
- **Storage**: Dual-write to regional append-only logs and a tamper-evident global ledger; retention aligned with compliance policy.
- **Access**: Least-privilege access with break-glass workflow logged and time-bound.

## Evidence for Regulators/Customers

- **Residency reports**: Periodic reports showing permit/deny counts, drift scans, and remediation actions per region.
- **Failover evidence**: Timeline with metrics, routing changes, fencing tokens issued, and reconciliation receipts.
- **Data repair logs**: Detailed receipts of replay/reconciliation jobs including items processed, conflicts resolved, and outstanding drift.

## Alerting & SLOs

- **SLOs**: Availability per region, replication lag, policy cache staleness, audit pipeline delivery success.
- **Alerts**: Paged on SLO burn rate breaches, residency violation attempts, and control-plane divergence detection.
- **Anomaly detection**: Optional ML-based drift detection on replication lag and policy-cache miss spikes with human approval for auto-remediation.

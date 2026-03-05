# SUI Operations Plan

## Operating model

SUI runs as an ingestion-first, snapshot-centric platform with deterministic scoring jobs and
policy-gated release controls.

## Job orchestration

1. Connector ingestion jobs collect external/internal signals.
2. Data normalization and provenance stamping jobs produce immutable snapshots.
3. Scoring/evaluation jobs run against snapshot IDs only.
4. Drift monitors compare current vs baseline snapshots per tenant cadence.
5. Remediation orchestrators generate ticket/export actions.

## Snapshot storage

- Immutable object storage with content-addressed snapshot IDs.
- Tenant + region partitioning to enforce residency and legal boundaries.
- TTL and retention are policy-configured by data class.

## SLOs (initial targets)

- `/score` p95 latency: <300ms on warm model cache.
- Daily drift runs complete within assigned tenant window.
- Evidence generation success: 99.9% of scheduled eval runs.
- Alerting MTTA for scoring pipeline incidents: <15 minutes.

## Cost controls

- Per-tenant caps: monitored entities, ingestion throughput, drift alerts/day.
- Budget alarms on connector and model-compute spend envelopes.
- Priority tiers for scoring frequency to bound peak compute.

## Monitoring and alerting

- Metrics: ingestion lag, scoring latency, reproducibility drift, alert precision.
- Traces: request-to-evidence trace IDs across API and pipeline jobs.
- Logs: structured, tenant-scoped, redacted for sensitive fields.
- Alerts: SLO burn rate, evidence gate failures, policy denials, connector outages.

## Runbooks

- Connector outage handling and backfill strategy.
- Unexpected score spike triage.
- Schema migration rollback.
- Evidence verification failure handling.
- Tenant isolation incident containment.

## Rollout and rollback

- Progressive rollout by tenant cohorts.
- Canary policy: new model versions limited to pilot cohort first.
- Rollback trigger: calibration degradation, UDR-AC drift, or policy gate failure.
- Rollback action: pin prior model + prior snapshot baseline and replay.

## Residency-aware deployment

- Regional compute pools with no cross-region raw artifact transfer.
- Cross-region federation uses derived metrics only.
- Key management and audit logs remain region-local by default.

## CI/Release checks

- Reproducible build verification.
- SBOM generation (CycloneDX/SPDX) and artifact signatures.
- Determinism/evidence gate.
- Policy gate and security scan bundle.

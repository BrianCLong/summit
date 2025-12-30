# Runtime Evidence & Telemetry

Runtime enforcement emits auditable evidence for every policy decision. The schema is defined in `runtime/telemetry/schema.json` and aligns with existing observability taxonomy (metrics, logs, traces) and provenance requirements.

## Event Fields

- **event_id**: UUID for the decision event.
- **timestamp**: ISO8601 time of evaluation.
- **policy_id / policy_domain**: Source policy identifiers from the catalog.
- **decision**: allow, deny, degrade, throttle, or kill.
- **response_profile**: Response profile applied from `runtime/response-matrix.yaml`.
- **reason_codes**: Machine-readable reasons for allow/deny decisions.
- **context**: Redacted context (tenant, subject, environment, risk_score, classification, feature_flag).
- **environment**: dev, demo, staging, or prod.
- **correlation_id**: Ties request, enforcement, and provenance records.
- **latency_ms**: Evaluation latency for SLO tracking.
- **provenance_ref**: Pointer to immutable provenance record.

## Telemetry Destinations

- **Logs**: Structured JSON logs compatible with ELK/Cloud Logging.
- **Metrics**: Counters and histograms keyed by policy_id, decision, and environment.
- **Traces**: Span events annotated with policy evaluation details for distributed tracing.
- **Provenance**: Immutable ledger entries referenced via `provenance_ref`.

## Evidence Guarantees

- **Completeness**: Every policy decision emits at least one telemetry record.
- **Integrity**: Correlation IDs chain request -> policy decision -> provenance.
- **Determinism**: Response profiles are versioned; telemetry includes the applied profile.
- **Redaction**: Context excludes raw secrets/PII; only identifiers and classification tags are recorded.

## Operational Use

- **Live alerting**: Alerts on deny/kill for critical policies, throttling saturation, and telemetry gaps.
- **Audit packs**: Evidence can be exported via `scripts/runtime/export-signals.ts` for compliance bundles.
- **Drift detection**: Telemetry anomalies feed drift detectors comparing runtime behavior to CI intent.

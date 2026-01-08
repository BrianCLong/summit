# Adapter Isolation Incidents

This runbook covers how to isolate a misbehaving adapter to prevent cross-tenant or systemic impact while keeping healthy adapters online.

## Detection

- Alerts: `AdapterRepeatedFailures` or `AdapterExcessiveRetries` for a specific adapter.
- Dashboards: check `observability/dashboards/adapters/latency.json` and `observability/dashboards/adapters/error-rate.json` for outliers.
- Symptoms: cascading retries, saturation on downstream dependencies, or elevated DLQ depth for a single adapter.

## Immediate Actions

1. **Identify the offender**: use metrics (adapter label) and logs to confirm which adapter/route is degrading.
2. **Quarantine traffic**:
   - Enable circuit breaker or increase failure thresholds for the adapter route in the gateway/mesh.
   - Scale the adapter deployment to zero or disable its consumer to stop processing.
3. **Protect shared services**: apply rate limits for the adapter at the ingress/broker to prevent retry storms.
4. **Communicate**: notify affected tenants and create an incident channel with owners from adapter, platform, and SRE teams.

## Remediation Workflow

1. Collect evidence: recent deploys, config changes, dependency outages, and payload samples.
2. Roll back to the last known good version or config if a regression is suspected.
3. Validate dependency health (databases, upstream APIs) before reintroducing traffic.
4. Re-enable the adapter gradually:
   - Start with a single replica and low rate limit.
   - Monitor latency/error dashboards and `adapter_retry_exhausted_total` during warm-up.

## Recovery Validation

- Error and retry rates return to baseline; no new DLQ backlog for the adapter.
- SLO probes show p95 latency and availability within thresholds for 30+ minutes.
- Incident alerts auto-resolve and no new anomalies appear after reintroduction.

## Post-Incident

- Document root cause, mitigation steps, and follow-up tasks.
- Add canary checks or feature flags to isolate future risky changes faster.
- Update dashboards/alerts if new signals proved useful during the incident.

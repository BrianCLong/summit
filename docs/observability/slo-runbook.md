# Observability First SLO Runbook

## Scope

This runbook guides on-call responders through SLO burn alerts emitted by the Observability First kit. It covers latency, error rate, and saturation signals for services instrumented via the telemetry SDKs.

## Alert Taxonomy

- **Latency SLO (p99 > 1s)** — Triggered when the 1-hour burn rate exceeds 2x and the 6-hour burn rate exceeds 1x.
- **Error Budget (5xx > 2%)** — Fired when the 5-minute burn rate exceeds 14x and the 1-hour burn rate exceeds 3x.
- **Saturation (CPU > 85% for 15m)** — Fires when either CPU or worker queue depth remains above thresholds for two consecutive windows.

## Runbook Steps

1. **Acknowledge** the alert in Alertmanager and link the alert ID in the Friday evidence log.
2. **Check Dashboards**
   - Navigate to the "Service Golden Signals" Grafana dashboard.
   - Confirm if the issue impacts a single region or all environments.
3. **Correlate Traces**
   - Use the trace ID embedded in the alert annotations to pull the span waterfall (API → worker → db).
   - Confirm baggage attributes `customer_tier` and `feature_flag` to scope blast radius.
4. **Mitigate**
   - For latency: enable adaptive sampling override to reduce tracing overhead and collect fresh traces.
   - For errors: inspect the structured logs (PII redacted) for the failing route and roll back the latest deployment if needed.
   - For saturation: scale the worker deployment or flush the dead-letter queue.
5. **Document**
   - Record root cause, mitigation, and recovery time in `.evidence/observability-first/alert-drills.md`.
   - File follow-up tickets using the provided Jira template.

## Escalation Matrix

- **Primary**: Observability First On-Call (Slack `#observability-ops`).
- **Secondary**: Platform SRE Escalation (PagerDuty schedule `sre-platform`).
- **Tertiary**: Portfolio Duty Officer (phone bridge listed in the duty roster).

## Testing Alerts

- Run `just obs:synthetic` to replay the synthetic load and confirm multi-window burn rate logic.
- Verify that the alert auto-closes when the 6-hour burn rate returns under the objective.

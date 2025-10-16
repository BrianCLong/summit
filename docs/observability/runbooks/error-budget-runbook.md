# Error Budget Depletion Runbook

## Trigger

- Alert: `error-budget-burn`
- Condition: Error rate consumes >5% of monthly budget in <1h or >10% in <6h

## Immediate Actions

1. Acknowledge incident in PagerDuty and open shared Zoom bridge.
2. Notify incident channel `#observability-alarms` with impact summary template.
3. Pause any in-flight deployments for the affected service.

## Diagnostic Steps

1. Check error breakdown on _Availability & Reliability_ dashboard.
2. Drill into logs filtered by `severity=error` and `service=$service` to identify exception signatures.
3. Inspect traces of top error routes; capture span attributes for context.
4. Review recent config changes, feature flags, and dependency health.

## Mitigation Options

- Roll back or disable newly released features/flags.
- Divert traffic to healthy region if multi-region architecture available.
- Enable circuit breaker for failing downstream dependencies.

## Escalation

- Engage feature owner and QA lead if customer impact confirmed.
- Notify Customer Support with status page update within 30 minutes if SLA violated.

## Verification

- Ensure error rate returns below 0.1% for 1h.
- Document root cause and corrective actions in incident ticket.

## Post-Incident

- Schedule alert tuning review if false positive.
- Add regression tests or chaos experiment capturing the failure scenario.

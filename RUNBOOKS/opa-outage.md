# Runbook: OPA Outage

## Scope

Restore policy decisioning when OPA is unavailable or returning repeated errors.

## Signals

- Alert: `SummitOpaEvaluationErrors`
- Metrics: `conductor_security_events_total{type="opa_evaluation_error"}` spike
- Logs: `OPA policy evaluation failed` in `server/src/conductor/governance/opa-integration.ts`

## Immediate Actions

1. Confirm OPA service health (`up{job="opa"}` if instrumented).
2. Check bundle freshness and signer status (Grafana dashboard: Run Governance Operations).
3. Apply traffic shaping for high-risk paths (reduce run throughput).

## Diagnosis

- Validate OPA endpoint reachability (`OPA_BASE_URL`/`OPA_URL`).
- Inspect policy bundle fetch logs and signer service availability.
- Verify network policies or service mesh routes between conductor and OPA.

## Mitigation

- Restart OPA pods or service.
- Re-publish policy bundles and re-trigger bundle download.
- Enable fallback deny path and temporarily pause new runs requiring policy evaluation.

## Verification

- `conductor_security_events_total{type="opa_evaluation_error"}` returns to baseline.
- `OPA Deny Rate` panel stabilizes and approvals resume.
- Run a canary policy evaluation from the conductor API.

## Escalation

- Escalate to security and platform teams if errors persist beyond 15 minutes.
- Declare a Governed Exception only for non-production environments.

## References

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- OPA integration: `server/src/conductor/governance/opa-integration.ts`

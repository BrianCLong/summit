# Operational Readiness - Tabletop Scenarios

**Sprint N+9: Operational Readiness Rehearsal**

This document outlines the tabletop scenarios executed to validate incident response playbooks before RC release.

## Scenario 1: Policy Breach (P0)

**Description**: An agent attempts to access a resource explicitly forbidden by OPA policy `policy/rbac/forbidden_access.rego`.

**Trigger**:

- Simulate an agent requesting `POST /api/admin/users` with `role: "analyst"`.
- Expected Outcome: OPA denies request with `403 Forbidden`.
- Alert Triggered: `SecurityPolicyViolation` (Severity: Critical).

**Response Steps**:

1.  **Detection**: Alert received in Slack/PagerDuty.
2.  **Triage**: Security Analyst reviews `provenance-ledger` for the `PolicyViolation` event.
3.  **Containment**:
    - Verify if the agent is compromised.
    - If automatic kill-switch failed, manually revoke agent token via `scripts/revoke_token.sh`.
4.  **Mitigation**: Patch policy if loophole found (unlikely in this scenario as it was a block).
5.  **Review**: Ensure audit log contains the full context of the denial.

**Success Criteria**:

- Alert latency < 1 minute.
- Audit log contains `decision_id`, `input`, and `result`.
- Agent blocked immediately.

---

## Scenario 2: Agent Misbehavior (Looping/Hallucination)

**Description**: An agent enters an infinite retry loop consuming quota.

**Trigger**:

- Simulate a job that fails and retries with 0 backoff, generating 1000 requests/sec.
- Expected Outcome: Rate Limiter kicks in.
- Alert Triggered: `HighRequestRate` / `QuotaExceeded`.

**Response Steps**:

1.  **Detection**: Prometheus alert `RateLimitHit` spikes for a specific Tenant/Agent.
2.  **Triage**: Operator checks Grafana "Quota" dashboard.
3.  **Containment**:
    - System should auto-throttle.
    - If impacting others, enable "Panic Mode" for that tenant via `scripts/panic_mode.sh <tenant_id>`.
4.  **Resolution**: Identify the bad job ID and cancel it via `maestro-cli kill <job_id>`.

**Success Criteria**:

- Other tenants unaffected (Isolation proven).
- Alert received within 2 minutes.

---

## Scenario 3: Observability Partial Outage

**Description**: Telemetry ingress (OTel Collector) fails, blinding the dashboard.

**Trigger**:

- Manually stop the `otel-collector` container.
- Expected Outcome: Metrics flatline.
- Alert Triggered: `TelemetryIngestDown` (Synthetics).

**Response Steps**:

1.  **Detection**: "Missing Data" alert fires.
2.  **Triage**: Operator attempts to access Grafana; sees gaps.
3.  **Mitigation**:
    - Check container status.
    - Restart service `docker compose restart otel-collector`.
    - Verify logs are buffered on clients (local storage) and not lost.
4.  **Recovery**: Verify backfill of metrics once service is up.

**Success Criteria**:

- Alert fires on "No Data".
- Client-side buffering prevents data loss (if implemented).

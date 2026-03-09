# Release Captain Control-Plane Triage Runbook

This runbook defines deterministic triage for GA-critical control-plane signals used by the
Release Train dashboard and Prometheus alerts.

## Scope

Use this runbook for merge/deploy orchestration failures involving:
- Release Captain workflow execution health
- Required gate concentration failures
- Merge readiness latency drift
- Circuit breaker safety events
- Rollback spikes

## Primary dashboard

- `ops/observability/grafana/release-train-dashboard.json`

## Alert playbooks

### Workflow failure ratio

**Alert:** `ReleaseCaptainWorkflowFailureRateHigh`

1. Open **Release Captain - Release Train** dashboard and inspect:
   - `Quality Gate Failures`
   - `Merge Readiness Snapshot`
2. Confirm whether failures are broad or gate-specific.
3. If broad, stop non-essential merges and page platform owner.
4. If gate-specific, route to gate owner and capture incident ticket.
5. Resume merge train only after failure ratio stays below 10% for 30 minutes.

### Gate failure concentration

**Alert:** `ReleaseCaptainGateFailureConcentrated`

1. Open `Gate Failure Ratio by Gate (%)` panel.
2. Identify top failing gate and compare against recent deploy/CI changes.
3. Execute targeted remediation:
   - test/lint gate: rerun failing workflow with deterministic seed
   - policy/evidence gate: validate evidence artifact generation integrity
   - deploy gate: verify staging health and rollback state
4. Record a post-incident note in the release log before reopening queue.

### Merge latency p95

**Alert:** `ReleaseCaptainMergeLatencyP95High`

1. Validate whether workflow success ratio has dropped.
2. Check queueing and retries in CI orchestration.
3. If success ratio is healthy but latency is high, apply temporary merge-rate shaping.
4. If both success and latency regress, freeze merges and trigger incident review.

### Circuit breaker open

**Alert:** `ReleaseCaptainCircuitBreakerOpen`

1. Treat as a safety event.
2. Confirm if breaker opened due to error budget burn or dependency outage.
3. Suspend auto-promotions.
4. Run rollback readiness checks and move to manual promotion mode.
5. Keep breaker closed-state stable for 30 minutes before returning to automation.

### Rollback spike

**Alert:** `ReleaseCaptainRollbackSpike`

1. Correlate recent rollback events with deployment IDs.
2. Identify shared failure domain (service, region, or gate).
3. Freeze additional promotions for impacted domain.
4. Escalate to incident commander if >2 rollbacks recur in the next hour.

## Escalation

- Page **Platform Engineering Lead** for any page-severity alert persisting beyond 15 minutes.
- Escalate to **Release Captain DRI** when circuit breaker remains open for >30 minutes.

## Exit criteria

Control plane considered recovered when all are true:
- Workflow failure ratio < 10% for 30 minutes
- No gate failure ratio > 15% in 30 minutes
- Circuit breaker state is CLOSED
- No rollbacks in trailing 60 minutes
- Merge latency p95 < 120 minutes

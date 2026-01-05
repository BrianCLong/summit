# SLO Breach Auto-Ramp Reducer Runbook

## Scope

The auto-ramp reducer is the governed response to SLO breach events. It reduces traffic exposure (ramp stage) when availability, latency, error-rate, or throughput objectives break, and it emits a provenance incident receipt for every breach handled.

**Authority files** (source of truth):

- `slo/*.yaml` (SLO objectives and alert metadata)
- `monitoring/prometheus/rules/summit-slo.rules.yml` (Prometheus alert bindings)
- `server/src/services/ramp/AutoRampReducer.ts` (reducer behavior)
- `server/src/provenance/incidentReceipt.ts` (incident receipts)

## Detection & Trigger

1. Prometheus evaluates the SLO alert rules in `monitoring/prometheus/rules/summit-slo.rules.yml`.
2. The `TenantSLOService` emits `slo.breach` events when a breach or critical burn rate is detected.
3. `AutoRampReducer` listens for `slo.breach` and computes a ramp reduction.

## Reducer Behavior

- **Step down**: reduce the current ramp by `AUTO_RAMP_STEP_DOWN` (default `0.25`).
- **Floor**: clamp at `AUTO_RAMP_MIN_STAGE` (default `0.1`).
- **Hold**: keep the new stage for `AUTO_RAMP_HOLD_MINUTES` (default `30`).
- **Traceability**: emit a provenance incident receipt with breach context and ramp action.

## Rollback Expectations

**Immediate rollback control (manual override):**

- Set `AUTO_RAMP_REDUCER_ENABLED=false` and restart the service.
- Restore ramp stage in the deployment controller to the last known safe value.

**Governed rollback (preferred):**

1. Confirm the breach context in the incident receipt (ledger entry).
2. Resolve the underlying issue (latency, availability, error rate, throughput).
3. Increase ramp in controlled steps (manual or policy-driven).
4. Re-enable auto-ramp reducer and observe `summit:slo_*` metrics for stability.

## Evidence & Receipts

- Every breach handled emits a ledger receipt with action type `INCIDENT_RECEIPT` and resource type `SLO_BREACH`.
- Receipt payload includes the breach metrics, recommended actions, and any ramp reduction applied.

## Verification Checklist

- [ ] SLO policies in `slo/` align with Prometheus thresholds.
- [ ] Prometheus is loading `/etc/prometheus/rules/*.yml`.
- [ ] `slo.breach` events are visible in logs.
- [ ] Provenance ledger contains `INCIDENT_RECEIPT` entries for breaches.

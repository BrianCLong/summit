# Adapter DLQ Replay Runbook

This runbook documents how to triage and replay adapter messages that land in the dead letter queue (DLQ) without dropping data or overloading upstream systems.

## Detection

- Alert: `AdapterDLQBacklogGrowing` (Prometheus). Investigate the Grafana DLQ dashboard: `observability/dashboards/adapters/dlq.json`.
- Key signals: rising `adapter_dlq_messages_total`, increasing `adapter_dlq_oldest_age_seconds`, and `adapter_dlq_replay_outcomes_total{outcome="failed"}`.

## Pre-flight

- Confirm which adapter and route are spiking by checking DLQ labels (adapter, route, tenant, error).
- Verify capacity: ensure target adapter replicas are healthy and queues are draining (`kubectl get pods -l app=adapters`).
- Freeze risky changes: pause deployments for the impacted adapter until replay completes.

## Replay Steps

1. **Pause intake**: throttle the producer for the failing adapter route if possible to prevent further DLQ growth.
2. **Fix root cause**: address the immediate error (config, credentials, schema drift). Re-deploy or update config maps/secrets as needed.
3. **Dry-run validation** (optional if supported): run a sample replay against a staging target to confirm the fix.
4. **Replay in batches**:
   - Start with a small batch (e.g., 50-100 messages) using the replay job/CLI (`adapterctl dlq replay --adapter <name> --limit 100`).
   - Monitor `adapter_dlq_replayed_total` and replay outcomes; keep batch size conservative until failure rate is <1%.
5. **Increase throughput**: once stable, scale batches/concurrency cautiously. Keep `adapter_request_duration_seconds` within SLO to avoid cascading retries.
6. **Re-enable producers** once backlog is below the steady-state threshold and no new failures are observed.

## Validation

- DLQ depth trending to zero and oldest message age decreasing toward current time.
- No new `adapter_dlq_replay_outcomes_total{outcome="failed"}` spikes.
- Upstream/downstream services remain healthy (CPU/memory within limits, latency steady).

## Rollback / Escalation

- If replay continues to fail, **stop replay** and open an incident channel. Capture sample payloads and error logs for forensic review.
- Escalate to on-call data platform + security if the failures involve signature/validation errors or untrusted payloads.
- Document the incident timeline and update automation scripts/tests to prevent recurrence.

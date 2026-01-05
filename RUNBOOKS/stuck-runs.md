# Runbook: Stuck Runs

## Scope

Recover orchestration runs that remain blocked or never progress.

## Signals

- Dashboard: Run Governance Operations → `Run Throughput` drops while queue depth grows.
- Metrics: `conductor_active_tasks` plateau or `intelgraph_glass_box_runs_total{status="running"}` rising with no completions.
- Logs: repeated `run_step status = BLOCKED` in approvals API.

## Immediate Actions

1. Identify affected run IDs from the approvals API (`/v1/approvals`).
2. Check queue depth and backlog growth for receipts and job queues.
3. Throttle new runs while clearing the backlog.

## Diagnosis

- Inspect approval requirements and pending approvals.
- Validate downstream dependencies (graph DB, signer, OPA).
- Check for stuck queue workers or exhausted concurrency limits.

## Mitigation

- Restart stuck workers and requeue failed steps.
- Approve or deny pending approvals to unblock steps.
- Scale run executors if concurrency limits reached.

## Verification

- `intelgraph_glass_box_runs_total{status="completed"}` rate recovers.
- `Receipt Queue Depth` stabilizes.
- No new run steps remain in `BLOCKED` state.

## Escalation

- Engage orchestration owners if runs remain blocked after two retries.
- Document any Governed Exception for manual overrides.

## References

- Approvals API: `server/src/conductor/api.ts`
- Metrics: `server/src/monitoring/metrics.ts`

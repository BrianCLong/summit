# Switchboard Approvals + Command Palette Operability Pack

## SLOs
- **Policy evaluation latency**: p95 < 100ms.
- **Command preflight + enqueue**: p95 < 1.5s.
- **Timeline receipt availability**: p95 < 2s.
- **Receipt verification failure rate**: < 0.1%.

## Metrics
- `switchboard_command_execute_total{status}`
- `switchboard_approval_decisions_total{decision}`
- `switchboard_policy_eval_ms_bucket`
- `switchboard_receipt_emit_ms_bucket`
- `switchboard_receipt_verify_failures_total`
- `switchboard_approval_cycle_time_ms_bucket`

## Dashboards
- `grafana/dashboards/switchboard-approvals.json`
  - Command execution rate
  - Policy evaluation latency
  - Approval cycle time
  - Receipt verification failures

## Alerts
- `grafana/alerts/switchboard-approvals-alerts.yaml`
  - Approval cycle time burn
  - Receipt verification failures
  - Policy evaluation latency spike

## Runbooks
- `RUNBOOKS/switchboard-approvals-stuck.md`
- `RUNBOOKS/switchboard-opa-latency.md`
- `RUNBOOKS/switchboard-receipt-verify-failing.md`
- `RUNBOOKS/switchboard-command-execution-failing.md`

# Latency SLO Burn Runbook

## Trigger

- Alert: `latency-burn-multiwindow`
- Condition: Burn rate >2x for 1h or >4x for 6h

## Immediate Actions

1. Acknowledge PagerDuty incident; assign SRE on-call.
2. Join `#observability-alarms` Slack channel war-room thread.
3. Snapshot Grafana panels:
   - _Performance & Latency_ dashboard: latency percentiles and dependency latency.
   - _Service Overview_ dashboard: error budget burn panel.

## Diagnostic Steps

1. Verify synthetic probe latency to rule out user traffic regressions.
2. Inspect request latency histograms by route to isolate high p99 contributors.
3. Review recent deploys (last 6h) in release calendar; coordinate with release captain.
4. Use trace exemplars to identify downstream dependencies exhibiting slow spans.

## Mitigation Options

- Roll back the most recent deployment.
- Enable contingency configuration: increase worker pool size, scale API replicas by 2x.
- Adjust sampling to 10% temporarily to enrich trace data for debugging.

## Escalation

- If latency persists >2h, engage service owner engineering lead and database team.
- Notify product ops if user-facing impact confirmed.

## Verification

- Confirm burn rate <1x for 30 minutes.
- Close PagerDuty incident with summary including root cause, mitigation, and follow-up tasks.

## Post-Incident

- File ticket for preventive action.
- Update runbook if new failure mode discovered.

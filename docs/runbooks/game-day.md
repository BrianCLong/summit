# Game Day Procedure

Scope: Validate monitoring, alerting, and runbook efficacy without user impact.

Preconditions: Staging environment, on-call engineer present, rollback plan available.

Steps

- Inject latency in a non-critical pipeline to trigger freshness alert (feature flag or env var).
- Drop a small partition to simulate completeness drop.
- Simulate brief orchestrator downtime to test availability alerts.
- Confirm alerts fire to Slack/Teams; acknowledge and follow runbooks.
- Capture time-to-detect (TTD) and time-to-resolve (TTR).

Success Criteria

- Alerts received within configured windows; dashboards reflect degradation.
- Runbook steps lead to recovery within expected times.
- Document lessons and update SLOs/runbooks as needed.

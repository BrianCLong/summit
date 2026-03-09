# Incident Response Runbook

## 1. Triage & Acknowledge
- Acknowledge the PagerDuty alert.
- Join the active incident channel (e.g., `#incidents-active`).
- Declare incident severity (SEV1, SEV2, SEV3).

## 2. Investigate
- Check Grafana dashboards for latency, error rates, and CPU/Memory usage.
- Search logs in Datadog/Kibana for stack traces.
- Identify the blast radius and affected subsystems.

## 3. Mitigate
- If the issue is tied to a recent release, initiate a rollback (see [ROLLBACK.md](./ROLLBACK.md)).
- If a bad feature flag is suspected, disable the flag.
- Scale up resources if experiencing capacity issues.

## 4. Resolve & Review
- Confirm metrics return to normal.
- Close the incident.
- Schedule a blameless postmortem (see [POSTMORTEM_TEMPLATE.md](../templates/POSTMORTEM_TEMPLATE.md)).

# Operational Runbook: Responding to High Error Rate Alerts

## Trigger Conditions
- PagerDuty Alert: "High Error Rate Detected"
- Error rate > 5% on any given service (API, Frontend, GraphRAG workers).
- Sudden spike in 5xx HTTP status codes in access logs.

## Step-by-Step Procedures

1. Open the #inc-summit-ops channel and acknowledge the alert.
2. Check the Grafana "System Health" dashboard to identify the specific service experiencing errors.
3. Review recent deployments or configuration changes.
4. If a recent deployment was made, refer to `docs/runbooks/op-rollback-deployment.md` to initiate a rollback.
5. If no deployment was made, investigate the logs for the affected service using the centralized logging system (e.g., Kibana, Splunk).
6. Look for common error patterns, database connection issues, or unhandled exceptions.
7. Attempt to restart the affected service pods to mitigate the issue temporarily if the root cause is unclear.
8. If the issue persists, escalate to the appropriate engineering team as per `docs/runbooks/op-oncall-escalation.md`.

## Verification Steps
- Monitor the error rate metrics on the Grafana dashboard to ensure they return to baseline (< 1%).
- Verify the affected service is responding correctly to health checks.
- Run the smoke test suite to confirm functionality: `scripts/smoke.sh <url>`.

## Rollback Instructions
- If a deployment rollback was performed, verify the service is running the previous stable version.
- If configuration changes were made during troubleshooting, revert them if they did not resolve the issue.
- Document all actions taken and the final resolution in the incident report.

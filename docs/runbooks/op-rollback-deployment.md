# Operational Runbook: Rolling Back a Bad Deployment

## Trigger Conditions
- High error rate on newly deployed services.
- High latency on API endpoints after a deployment.
- Deployment failure resulting in partial or failed updates.
- PagerDuty Alert: "Service Unavailable" immediately following a deployment.

## Step-by-Step Procedures

1. Open the #inc-summit-ops channel and acknowledge the alert.
2. Verify the cause of the failure using the Grafana "System Health" dashboard.
3. Access the deployment repository and identify the previous known-good deployment SHA.
4. Execute the rollback command: `gh workflow run Deploy-to-Prod --ref main -f image=<prev-sha>`.
5. Monitor the deployment progress in GitHub Actions.
6. Verify the pods for the affected service are running the previous known-good image version.
7. Confirm that the error rate and latency metrics return to baseline levels.

## Verification Steps
- Run the smoke test suite to confirm functionality: `scripts/smoke.sh <url>`.
- Monitor the error rate and latency metrics on the Grafana dashboard to ensure stability.
- Check the logs of the affected service to confirm the rollback was successful and the issue is resolved.

## Rollback Instructions
- In the rare event that the rollback deployment fails or causes further issues, escalate to the engineering team for a hotfix or further investigation.
- Document all actions taken and the final resolution in the incident report.

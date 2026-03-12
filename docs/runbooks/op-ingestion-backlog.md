# Operational Runbook: Handling Ingestion Backlog

## Trigger Conditions
- PagerDuty Alert: "High Ingestion Backlog Queue Depth".
- Queue depth metric > 100,000 items and sustained growth over 10 minutes.
- Increased CPU or memory usage on ingestion worker pods.

## Step-by-Step Procedures

1. Open the #inc-summit-ops channel and acknowledge the alert.
2. Check the Grafana "Ingestion Pipeline Health" dashboard to identify the current queue depth, ingestion rate, and processing errors.
3. Review logs from the ingestion worker pods to identify any slow-processing items, database lock contentions, or API rate limits.
4. Scale up the ingestion worker pods horizontally as described in `docs/runbooks/op-scaling-graphrag.md`.
5. If the issue is related to API rate limits, consider scaling down the ingestion workers temporarily to allow the rate limit to reset.
6. Investigate the source of the ingestion backlog (e.g., sudden burst of data, slow upstream service).
7. If the backlog is caused by a known issue with the GraphRAG pipeline, pause ingestion and troubleshoot the underlying cause.

## Verification Steps
- Monitor the queue depth metrics on the Grafana dashboard to confirm the backlog is decreasing.
- Ensure the ingestion rate returns to a healthy baseline.
- Run the smoke test suite to confirm functionality: `scripts/smoke.sh <url>`.

## Rollback Instructions
- Scale the ingestion worker pods back to normal capacity once the backlog is cleared.
- Ensure any temporary configuration changes (e.g., API rate limit adjustments) are reverted to their original settings.
- Document all actions taken and the final resolution in the incident report.

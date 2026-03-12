# Operational Runbook: Scaling the GraphRAG Pipeline

## Trigger Conditions
- High latency in GraphRAG queries (P95 latency > 2s over 5 minutes).
- Ingestion backlog queue depth > 100,000 items and growing.
- Sustained high CPU or memory utilization (>80%) on GraphRAG workers.
- Planned spike in analytical workloads.

## Step-by-Step Procedures

### Horizontal Scaling (Adding More Workers)
1. Open the deployment repository and navigate to the `deploy/kubernetes` folder.
2. Update the `replicaCount` for the `graphrag-worker` deployment in `values.yaml` (e.g., increase from 10 to 20).
3. Commit and push the change to trigger the `deploy-graphrag` workflow.
4. Monitor the deployment to ensure new pods reach the `Running` state and pass health checks.

### Vertical Scaling (Increasing Resources per Worker)
1. Open the deployment repository and navigate to the `deploy/kubernetes` folder.
2. Update the `resources.requests` and `resources.limits` for CPU and memory in `values.yaml` for the `graphrag-worker` deployment.
3. Commit and push the change to trigger the `deploy-graphrag` workflow.
4. Monitor the rolling restart of pods to ensure the new resources are applied correctly without disruption.

## Verification Steps
- Verify the new pod instances are healthy and processing tasks.
- Monitor the queue depth metrics in Grafana; verify the backlog is decreasing.
- Check the GraphRAG query latency metrics to confirm improvement (P95 latency < 1s).
- Run the smoke test suite to verify overall functionality: `scripts/smoke.sh <url>`.

## Rollback Instructions
- Revert the changes to the `replicaCount` or `resources` in `values.yaml`.
- Commit and push to trigger the deployment.
- Verify the pods are scaled back down or resources are restored to previous levels.
- Document any issues or failed scaling attempts in the incident report.

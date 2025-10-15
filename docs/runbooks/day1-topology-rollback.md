# Day-1 Topology Canary & Rollback Runbook (Stub)

## Purpose
Provide operators with a concise sequence to evaluate canary health, trigger rollback, and validate tenant isolation within a regional cell.

## Preconditions
- Argo Rollouts CLI configured with cluster credentials for the target region.
- Access to observability dashboards (API success rate, p95 latency, job success) and OPA audit feed.
- Change ticket includes deployment manifest commit SHA and policy bundle version.

## Canary Evaluation
1. Confirm canary weight set to 5% and receiving traffic via `argo rollouts get rollout appsvc -n <cell>`.
2. Monitor API success rate (target 99.9%) and p95 latency (<1.5s) for 15 minutes. If burn rate >2% or latency exceeds threshold, proceed to rollback.
3. Validate tenancy smoke test results (cross-tenant query attempts must fail) and confirm Kafka lag within normal bounds.

## Rollback Procedure
1. Execute `argo rollouts undo rollout appsvc -n <cell>` to redirect traffic to the stable slice.
2. Revert configuration via GitOps pipeline (mesh, OPA bundle, Redis config) using the change ticket SHA.
3. Flush tenant-specific Redis namespaces tied to the canary slice to prevent stale policy caching.
4. Trigger database health checks (Neo4j cluster status, Postgres replication, Kafka MirrorMaker) to confirm data-plane stability.

## Post-Rollback Validation
- Run synthetic API tests across tenant cohorts; confirm success >=99.9% and latency back under SLO.
- Review OPA decision logs for deny/allow anomalies during rollback window.
- File incident summary referencing ADR 0007 and ADR 0008, including any follow-up tasks.

## Open Items
- Automate step 3 (cache flush) via runbook script.
- Integrate offline cell export verification to ensure rollback did not interrupt bundle generation.

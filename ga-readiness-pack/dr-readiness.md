# DR Readiness Evidence

**Last Verification:** Pending Execution

## Backup Status
| Component | Last Backup Timestamp | Location | Retention |
| :--- | :--- | :--- | :--- |
| **Postgres (RDS)** | 2025-10-24 23:00 UTC | AWS Snapshot (us-east-1) | 30 Days |
| **Neo4j** | 2025-10-24 23:00 UTC | S3 `intelgraph-backups` | 30 Days |
| **Etcd (K8s)** | 2025-10-24 23:00 UTC | S3 `intelgraph-infra-backups` | 7 Days |

## Restore Test Plan
1.  **Objective:** Verify RTO < 4 hours.
2.  **Scenario:** "Total Region Failure" simulation.
3.  **Steps:**
    *   Provision new RDS instance from snapshot.
    *   Provision new Neo4j cluster and hydrate from S3 dump.
    *   Update DNS to point to DR region (us-west-2).
4.  **Success Criteria:** Application passes Smoke Test suite.

## Replication
*   **Postgres:** Cross-region read replica (us-west-2) is **SYNCED** (Lag < 100ms).
*   **Neo4j:** Causal Cluster backup scheduled every 6 hours.

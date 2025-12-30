# Disaster Recovery Plan

**RPO:** 5 minutes
**RTO:** 30 minutes

## Scenarios

### 1. Availability Zone Failure (e.g., us-east-1a)
*   **Detection:** Load Balancer health checks fail.
*   **Response:** Automatic. ASG launches instances in `us-east-1b` and `us-east-1c`.
*   **Data:** RDS Multi-AZ handles failover (~60s).

### 2. Region Failure (Total Loss of us-east-1)
*   **Detection:** Global synthetic probes fail.
*   **Response:**
    1.  Update DNS (Route53) to point to `eu-central-1` (Standby).
    2.  Scale up `eu-central-1` cluster.
    3.  Promote Cross-Region Read Replicas (RDS & Neo4j) to Primary.
*   **Data Loss:** ~5 minutes (Async replication lag).

### 3. Cyber Attack (Ransomware/Data Wipe)
*   **Response:**
    1.  Isolate network (Safety Valve).
    2.  Restore from "Air-Gapped" S3 Backup (Object Lock enabled).
    3.  Replay Provenance Ledger to reconstruct state.

## Drills
*   **Last Drill:** 2025-09-15
*   **Outcome:** Pass (RTO achieved: 22m)

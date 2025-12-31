# Recovery Objectives & Protocols

> **Target State**: GA+ (Sprint N+9)
> **Owner**: Resilience Engineering Lead
> **Status**: APPROVED

This document defines the RPO/RTO targets and the protocols for achieving them.

## 1. Recovery Objectives

### 1.1 Critical Services

| Service | RPO (Data Loss) | RTO (Downtime) | Strategy |
| :--- | :--- | :--- | :--- |
| **Identity & Auth** | 0 seconds | < 5 mins | Global/Multi-Region OIDC. |
| **Core API (Postgres)** | < 1 min | < 15 mins | Async Replication + Automated Promotion. |
| **Graph Intelligence (Neo4j)** | < 5 mins | < 30 mins | Causal Clustering + Read Replicas. |
| **Evidence Storage** | 0 seconds | < 5 mins | Cross-Region Replication (CRR). |
| **Search (Elastic)** | N/A (Reconstructible) | < 1 hour | Reindex from Source of Truth. |

### 1.2 Non-Critical Services

| Service | RPO | RTO | Strategy |
| :--- | :--- | :--- | :--- |
| **Analytics/Reporting** | < 1 hour | < 4 hours | Restore from nightly backups. |
| **Developer Sandbox** | < 24 hours | < 24 hours | Rebuild from IaC. |

## 2. Disaster Recovery Protocols

### 2.1 Scenario A: Single Region Outage (e.g., `us-east-1` Down)
**Trigger**: 3+ critical services unreachable for > 5 mins.
**Protocol**: `DR-PROTOCOL-FAILOVER-WEST`

1.  **Acknowledge**: OnCall Engineer confirms outage via external status page or synthetic monitors.
2.  **DNS Switch**: Update Route53 to weight 100% to `us-west-2`.
3.  **DB Promotion**:
    *   Execute `scripts/dr/promote-postgres.sh us-west-2`
    *   Execute `scripts/dr/promote-neo4j.sh us-west-2`
4.  **Scale Up**: Increase K8s HPA min-replicas in `us-west-2`.
5.  **Notify**: Update Status Page.

### 2.2 Scenario B: Data Corruption (e.g., Ransomware/Bug)
**Trigger**: Integrity check failure or mass deletion detected.
**Protocol**: `DR-PROTOCOL-RESTORE-POINT`

1.  **Isolation**: Sever all write access. Put API in "Maintenance Mode".
2.  **Assessment**: Identify "Last Known Good" timestamp via `manifest.json` logs.
3.  **Restore**:
    *   Run `ts-node scripts/restore.ts <backup-id>`
4.  **Verify**: Run `scripts/verify-integrity.ts`.
5.  **Resume**: Re-enable write access.

## 3. Drills & Verification

### 3.1 Quarterly Drill Schedule
*   **Q1**: Database Failover (Simulated).
*   **Q2**: Region Loss (Simulated via Chaos).
*   **Q3**: Full Backup/Restore (Staging).
*   **Q4**: Game Day (Surprise Injection).

### 3.2 Automated Drills
The script `scripts/dr/drill.ts` is run weekly in Staging to verify backup validity.

## 4. Manual vs Automated Steps

*   **Automated**: Backups, Heartbeat Monitoring, Artifact Replication.
*   **Manual (Human Decision)**: Region Failover (to prevent flap), Point-in-Time Restore Selection.

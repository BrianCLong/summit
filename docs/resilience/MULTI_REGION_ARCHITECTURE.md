# Multi-Region Architecture & Resilience Contract

> **Target State**: GA+ (Sprint N+9)
> **Owner**: Resilience Engineering Lead
> **Status**: APPROVED

This document defines the architectural contract for Summit's multi-region resilience, specifying how the platform survives region loss, data corruption, and infrastructure faults.

## 1. Multi-Region Strategy

Summit employs a **Primary-Secondary-Tertiary** region model to ensure business continuity and data residency compliance.

### 1.1 Supported Regions (GA+)

| Role | Region | Provider | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary** | `us-east-1` (N. Virginia) | AWS | Active read/write traffic, primary data authority. |
| **Secondary** | `us-west-2` (Oregon) | AWS | Warm standby (RTO < 15m). Async replication target. |
| **Tertiary** | `eu-central-1` (Frankfurt) | AWS | EU Data Residency + Disaster Recovery (Cold Storage). |

### 1.2 Component Stance

| Component | Stance | Behavior |
| :--- | :--- | :--- |
| **Stateless Services** (API, Web) | Active-Active | Deployed to all regions. Traffic routed via Global DNS (Route53) with health checks. |
| **PostgreSQL** (Relational) | Active-Passive | Primary RW in `us-east-1`. Async replication to `us-west-2`. Read replicas in all regions. |
| **Neo4j** (Graph) | Active-Passive | Causal Clustering. Core instances in `us-east-1`. Read Replicas in `us-west-2` and `eu-central-1`. |
| **Redis** (Cache/Queue) | Region-Isolated | No cross-region replication for cache. Job queues are region-local; failed jobs are DLQ'd. |
| **Object Storage** (S3) | Active-Active | Cross-Region Replication (CRR) enabled for artifacts and evidence. |

## 2. Traffic Routing & Failover

### 2.1 Read/Write Routing
*   **Writes**: Always directed to the **Primary Region**.
*   **Reads**:
    *   **Strong Consistency**: Directed to Primary Region.
    *   **Eventual Consistency**: Can be served by local region Read Replicas.

### 2.2 Region Loss Scenario
If `us-east-1` fails:
1.  **Detection**: Route53 health checks fail (3 consecutive failures over 30s).
2.  **DNS Failover**: Traffic automatically shifts to `us-west-2` for stateless services.
3.  **Database Promotion** (Manual/Scripted):
    *   Postgres Secondary in `us-west-2` promoted to Primary.
    *   Neo4j Leader elected in `us-west-2`.
4.  **Reconfiguration**: Application config updated to point to new Write endpoints.

**RTO (Recovery Time Objective)**: 15 minutes.
**RPO (Recovery Point Objective)**: < 1 minute (async replication lag).

## 3. Data Residency & Blast Radius

### 3.1 Data Residency
*   **Strict Isolation**: Tenants tagged with `region: eu` have their data pinned to `eu-central-1`.
*   **Replication Rules**:
    *   `us` data replicates `us-east-1` -> `us-west-2`.
    *   `eu` data stays in `eu-central-1` (no replication to US, unless strictly anonymized).

### 3.2 Blast Radius Boundaries
*   **Fault Isolation**: Regions are shared-nothing architectures. A control plane failure in `us-east-1` does not affect `us-west-2`.
*   **Global Dependencies**: Minimal. Only DNS and IAM are global.

## 4. Resilience Primitives

### 4.1 Backup & Restore
*   **Frequency**:
    *   **Full**: Daily (UTC 00:00).
    *   **Incremental**: Every 6 hours.
    *   **WAL/Transaction Logs**: Continuous streaming (PITR capable).
*   **Immutability**: Backups stored in WORM (Write Once Read Many) compliant buckets.
*   **Encryption**: All backups encrypted at rest with region-specific KMS keys.

### 4.2 Data Integrity
*   **Audit Log Integrity**: Merkle Tree hashing ensures audit logs cannot be tampered with.
*   **Artifact Verification**: All binary artifacts (SBOMs, evidence) must match SHA-256 checksums before use.

## 5. Testing & Verification

*   **DR Drills**: Conducted quarterly. Simulates region loss and partial data corruption.
*   **Chaos Engineering**: Weekly automated fault injection (latency, packet loss) in Staging.

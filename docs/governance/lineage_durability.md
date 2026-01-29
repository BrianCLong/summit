# Lineage Durability & Recovery Standards

**Effective Date:** 2026-01-25
**Owner:** Governance Engineering

## 1. Durability Tiers

Lineage data is classified into three durability tiers to ensure recoverability and compliance.

### 🔥 Hot Tier: Canonical Graph (Neo4j)
*   **Purpose:** Real-time query, impact analysis, active governance gates.
*   **State:** Mutable, projected from Ledger.
*   **Availability:** High (99.9%).
*   **Persistence:** Ephemeral (can be rebuilt).

### ☀️ Warm Tier: Periodic Snapshots
*   **Purpose:** Fast recovery, point-in-time analysis.
*   **State:** Immutable snapshots of the Graph.
*   **Frequency:** Daily.
*   **Storage:** Object Storage (S3).

### ❄️ Cold Tier: Provenance Ledger (Postgres) & Logs
*   **Purpose:** Legal audit, compliance, absolute source of truth.
*   **State:** Append-only, cryptographically verifiable (Hash Chain).
*   **Persistence:** Permanent (WORM storage).
*   **RPO:** 0 (Synchronous write).

## 2. Recovery Objectives

| Metric | Target | Description |
| :--- | :--- | :--- |
| **RPO** (Recovery Point Objective) | **0 seconds** | No loss of acknowledged lineage events allowed. Enforced by Synchronous Ledger writes. |
| **RTO** (Recovery Time Objective) | **4 hours** | Time to rebuild Hot Tier (Graph) from Cold Tier (Ledger) in case of total graph corruption. |

## 3. Replayability Standard

All lineage events MUST be replayable.
*   **Deterministic IDs:** Events must carry or derive stable IDs (e.g., `job_id + step_id`).
*   **Idempotency:** Ingestion pipelines must handle duplicate events gracefully.
*   **Completeness:** Logs + Ledger must contain sufficient data to reconstruct the Graph state.

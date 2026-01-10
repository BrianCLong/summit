# Data Retention Policy (GA Baseline)

## 1. Retention Intent

For the General Availability (GA) release, the system adopts a **conservative retention posture**. Data is generally retained to support auditability, provenance, and operational continuity unless explicitly deleted by a tenant or expired via policy.

## 2. Retention Schedules by Category

| Data Category | Retention Period | Rationale | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **Audit Events** | **7 Years** | Compliance & Regulatory (Default) | `AdvancedAuditSystem` (`AUDIT_RETENTION_DAYS`, `retentionPeriodDays`) |
| **Provenance Ledger** | **Indefinite** | Integrity & Chain of Custody | Core Database (No automated deletion) |
| **Application Logs** | **90 Days** | Operational Troubleshooting | External Log Aggregator / File Rotation |
| **Operational Metrics** | **30 Days** | Performance Analysis | Prometheus Retention Policy |
| **Cache (Redis)** | **Varies (TTL)** | Performance | Automated TTL Expiry (e.g., `CACHE_TTL_DEFAULT`) |
| **Tenant Data** | **Indefinite** | Customer Record | Manual Deletion on Termination |

## 3. Automated Enforcement

### 3.1 Audit System Pruning
*   **Component**: `server/src/audit/advanced-audit-system.ts`
*   **Logic**: A background interval runs (`retentionIntervalHours`) to prune events older than `retentionPeriodDays` (Default: 2555 days / 7 years).
*   **Configuration**: `AUDIT_RETENTION_DAYS` environment variable.

### 3.2 Ephemeral Data (TTL)
*   **Mechanism**: Redis Key Expiry
*   **Policies**:
    *   **Case Overview Cache**: Configurable via `CASE_OVERVIEW_CACHE_TTL_MS`.
    *   **OPA Decisions**: `OPA_CACHE_TTL_MS` (Default: 60s).
    *   **Auth Tokens (JTI)**: `replayProtectionTTL` (15 mins).
    *   **General Cache**: `CACHE_TTL_DEFAULT` (varies).

## 4. Manual Deletion Paths

### 4.1 Tenant Deletion
*   **Trigger**: Contract termination or "Right to be Forgotten" (RTBF) request.
*   **Process**: Operator-initiated script or API call (out of scope for automated self-serve in GA).
*   **Scope**: Deletion of rows in PostgreSQL and nodes in Neo4j associated with `tenant_id`.

## 5. Out of Scope (GA)

*   **Automated Archival Tiers**: Moving cold data to S3/Glacier automatically is not implemented for GA.
*   **Self-Serve Retention Policies**: Tenants cannot configure their own retention periods via UI in GA.

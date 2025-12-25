# Definition of Production

This document defines what constitutes "Production" for the IntelGraph platform.

## 1. Deployable Units
The following services are considered Production entities. They must be deployed from the `main` branch, versioned, and monitored.

*   **IntelGraph Server (API/Backend)**: The core Node.js application.
*   **Summit Web Client**: The React frontend application.
*   **Ingestion Service**: The Python worker for data processing.
*   **PostgreSQL**: The primary relational store.
*   **Neo4j**: The graph database.
*   **Redis**: The cache and message broker.
*   **Socket.IO Server**: Real-time event gateway.

## 2. Environments

| Environment | Branch | Purpose | Data Persistence | Access |
| :--- | :--- | :--- | :--- | :--- |
| **Production** | `main` | Live customer traffic | Permanent (WORM) | STRICT (JIT/Breakglass) |
| **Staging** | `release/*` | Pre-prod validation | Transient (7 days) | Team Members |
| **Dev/Labs** | `feature/*` | Experimentation | Ephemeral (Reset daily) | Developers |

## 3. Data Retention & Compliance
*   **Audit Logs**: WORM storage, retained for 7 years.
*   **Application Logs**: Retained for 30 days (hot), archived to S3 (cold) for 1 year.
*   **Backups**:
    *   **RPO**: 15 minutes (Point-in-time recovery).
    *   **RTO**: 4 hours.
    *   Frequency: Daily full snapshots, hourly incremental.

## 4. Operational Expectations (On-Call)
*   **SLO Violation**: P1 alert (Page).
    *   p95 Latency > 1500ms
    *   Error Rate > 1%
*   **Availability**: 99.9% uptime required during business hours.
*   **Response Time**:
    *   SEV-1 (Outage): 15 min response.
    *   SEV-2 (Degraded): 2 hour response.

## 5. Security & Gates
*   No deployment to Production without passing the **Security Gate** (SAST + SCA + Secret Scan).
*   No manual DB mutations in Production without a traceable ticket and peer review.

### Security Gate Override Process
In the event of a critical incident (SEV-1) requiring an emergency fix that fails a security gate (e.g., false positive or acceptable risk):
1.  **Approval**: VP of Engineering or Head of Security must explicitly approve the override.
2.  **Documentation**: The PR description must link to a Jira Security Issue tracking the debt/exception.
3.  **Procedure**: Use the `[Security Override]` tag in the merge commit and use administrative merge privileges.

# Definition of Production

**Owner:** Advisory Committee (Chair: Guy IG)
**Last Updated:** 2025-12-29

This document defines what constitutes "Production" for the IntelGraph platform.

## 1. Environment Definitions

We strictly distinguish between **Production**, **Labs**, and **Development** environments to ensure trust, stability, and security.

### Production (`prod`)

- **Purpose:** The live, user-facing environment for real-world intelligence analysis.
- **Data Constraint:** Real, sensitive data. **NO** mock data. **NO** test artifacts.
- **Access:** Strictly controlled via RBAC and OIDC. No direct DB access.
- **Stability:** 99.9% uptime SLA.
- **Deployable:** Must pass all CI blocking gates (Security, Tests, Lint).
- **Trust:** Full audit tracing enabled. WORM storage for compliance logs.
- **Fence:** No connection to Labs.

### Labs (`labs`)

- **Purpose:** Experimental sandbox for testing new Agents, Heuristics, and "Black Project" capabilities.
- **Data Constraint:** Synthetic or anonymized data only. **NO** production PII.
- **Access:** Looser restrictions for developers/researchers.
- **Stability:** Best effort. May be reset/purged.
- **Trust:** Experimental capabilities (e.g., untrusted LLMs) are isolated here.

### Development (`local` / `dev`)

- **Purpose:** Local engineering loop.
- **Data Constraint:** Seed data (`make seed:small`) or mock data.
- **Definition:** The environment instantiated by `make up`.

| Environment    | Branch      | Purpose               | Data Persistence        | Access                  |
| :------------- | :---------- | :-------------------- | :---------------------- | :---------------------- |
| **Production** | `main`      | Live customer traffic | Permanent (WORM)        | STRICT (JIT/Breakglass) |
| **Staging**    | `release/*` | Pre-prod validation   | Transient (7 days)      | Team Members            |
| **Dev/Labs**   | `feature/*` | Experimentation       | Ephemeral (Reset daily) | Developers              |

## 2. Deployable Artifacts

A **Deployable** is a versioned, immutable artifact that can be promoted across environments.

| Artifact                 | Source Path          | Type         | Criticality       |
| :----------------------- | :------------------- | :----------- | :---------------- |
| **IntelGraph Server**    | `server/`            | Docker Image | **Critical** (P0) |
| **Summit Web Client**    | `apps/web/`          | Static SPA   | **Critical** (P0) |
| **Ingestion Workers**    | `services/ingest/`   | Docker Image | High (P1)         |
| **Maestro Orchestrator** | `server/src/maestro` | Docker Image | High (P1)         |
| **PSC Runner**           | `rust/psc-runner`    | Binary       | High (P1)         |
| **PostgreSQL**           | -                    | Docker Image | **Critical** (P0) |
| **Neo4j**                | -                    | Docker Image | **Critical** (P0) |
| **Redis**                | -                    | Docker Image | High (P1)         |
| **Socket.IO Server**     | -                    | Docker Image | High (P1)         |

## 3. Definition of Done (DoD) for Production

A feature or fix is **Production Ready** only when:

1.  **CI Green:** All tests pass in the `pr-quality-gate` workflow.
2.  **Security Scanned:** Zero Critical/High vulnerabilities in dependencies or code (SAST/SCA).
3.  **Reviewed:** Approved by a CODEOWNER for the specific domain (Auth, DB, etc.).
4.  **Traceable:** All critical flows emit Audit Events with a Correlation ID.
5.  **Documented:** Public API changes are reflected in OpenAPI/GraphQL schemas.
6.  **Flagged:** Risky features are behind a Feature Flag (disabled by default).

## 4. Critical Paths

These flows must **always** be functional in Production. A failure here is a SEV-1 incident.

1.  **Auth & Access:** Login, Token Refresh, Permission Check (`ensureAuthenticated`, `ensureRole`).
2.  **Investigation:** Search (`searchAll`), Entity Retrieval, Graph Expansion.
3.  **Ingestion:** Data pipeline from Source -> Ingest -> DB.
4.  **Audit:** Immutable recording of user actions to the Provenance Ledger.

## 5. Data Retention & Compliance

- **Audit Logs**: WORM storage, retained for 7 years.
- **Application Logs**: Retained for 30 days (hot), archived to S3 (cold) for 1 year.
- **Backups**:
  - **RPO**: 15 minutes (Point-in-time recovery).
  - **RTO**: 4 hours.
  - Frequency: Daily full snapshots, hourly incremental.

## 6. Operational Expectations (On-Call)

- **SLO Violation**: P1 alert (Page).
  - p95 Latency > 1500ms
  - Error Rate > 1%
- **Availability**: 99.9% uptime required during business hours.
- **Response Time**:
  - SEV-1 (Outage): 15 min response.
  - SEV-2 (Degraded): 2 hour response.

## 7. Security & Gates

- No deployment to Production without passing the **Security Gate** (SAST + SCA + Secret Scan).
- No manual DB mutations in Production without a traceable ticket and peer review.

### Security Gate Override Process

In the event of a critical incident (SEV-1) requiring an emergency fix that fails a security gate (e.g., false positive or acceptable risk):

1.  **Approval**: VP of Engineering or Head of Security must explicitly approve the override.
2.  **Documentation**: The PR description must link to a Jira Security Issue tracking the debt/exception.
3.  **Procedure**: Use the `[Security Override]` tag in the merge commit and use administrative merge privileges.

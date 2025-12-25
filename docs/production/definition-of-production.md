# Definition of Production

**Scope:** `feature/sprint-lock-2025-12-29`
**Owner:** Advisory Committee (Chair: Guy IG)

## 1. Environment Definitions

We strictly distinguish between **Production**, **Labs**, and **Development** environments to ensure trust, stability, and security.

### 🟢 Production (`prod`)
*   **Purpose:** The live, user-facing environment for real-world intelligence analysis.
*   **Data Constraint:** Real, sensitive data. **NO** mock data. **NO** test artifacts.
*   **Access:** Strictly controlled via RBAC and OIDC. No direct DB access.
*   **Stability:** 99.9% uptime SLA.
*   **Deployable:** Must pass all CI blocking gates (Security, Tests, Lint).
*   **Trust:** Full audit tracing enabled. WORM storage for compliance logs.
*   **Fence:** No connection to Labs.

### 🧪 Labs (`labs`)
*   **Purpose:** Experimental sandbox for testing new Agents, Heuristics, and "Black Project" capabilities.
*   **Data Constraint:** Synthetic or anonymized data only. **NO** production PII.
*   **Access:** Looser restrictions for developers/researchers.
*   **Stability:** Best effort. May be reset/purged.
*   **Trust:** Experimental capabilities (e.g., untrusted LLMs) are isolated here.

### 💻 Development (`local` / `dev`)
*   **Purpose:** Local engineering loop.
*   **Data Constraint:** Seed data (`make seed:small`) or mock data.
*   **Definition:** The environment instantiated by `make up`.

## 2. Deployable Artifacts

A **Deployable** is a versioned, immutable artifact that can be promoted across environments.

| Artifact | Source Path | Type | Criticality |
| :--- | :--- | :--- | :--- |
| **IntelGraph Server** | `server/` | Docker Image | **Critical** (P0) |
| **Summit Web Client** | `apps/web/` | Static SPA | **Critical** (P0) |
| **Ingestion Workers** | `services/ingest/` | Docker Image | High (P1) |
| **Maestro Orchestrator** | `server/src/maestro` | Docker Image | High (P1) |
| **PSC Runner** | `rust/psc-runner` | Binary | High (P1) |

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

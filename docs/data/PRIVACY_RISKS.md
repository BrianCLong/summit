# Privacy Risk Register (GA Scoped)

## 1. Identified Risks

### 1.1 Risk: PII Leaks in Logs
*   **Description**: Sensitive user data (emails, names) could inadvertently appear in application logs during error handling or debugging.
*   **Severity**: Medium
*   **Evidence**: `server/src/utils/logger.ts`
*   **Mitigation**:
    *   **Sanitization Middleware**: `server/src/middleware/sanitize.ts` strips common sensitive fields from request bodies before logging.
    *   **Redaction**: Logger configuration (`pino`) includes redaction rules for specific keys (e.g., `password`, `token`).
*   **Owner**: Security Lead

### 1.2 Risk: Cross-Tenant Metadata Leakage
*   **Description**: Shared infrastructure (PostgreSQL, Neo4j) creates a risk where a query bug could expose one tenant's metadata to another.
*   **Severity**: High
*   **Evidence**: `server/src/tenancy/`
*   **Mitigation**:
    *   **Tenant Isolation Guard**: `TenantSafePostgres` wrapper enforces `tenant_id` on all queries.
    *   **Middleware**: `server/src/middleware/auth.ts` injects `tenant_id` into the request context, which is propagated to DB calls.
*   **Owner**: Engineering Lead (Backend)

### 1.3 Risk: Unstructured PII in Graph Data
*   **Description**: Users may input PII (e.g., names in descriptions) into free-text fields that are stored in the graph.
*   **Severity**: Low (Functional Requirement)
*   **Evidence**: `server/src/privacy/piiOntologyEngine.ts`
*   **Mitigation**:
    *   **PII Detection Hooks**: `server/src/pii/ingestionHooks.ts` scans content for entities and classifies them.
    *   **Sensitivity labeling**: Data can be tagged with sensitivity levels (`server/src/pii/sensitivity.ts`).
*   **Owner**: Data Privacy Officer (DPO)

## 2. Risk Acceptance (GA)

*   **RA-001**: **No Column-Level Encryption in PostgreSQL**.
    *   **Rationale**: Reliance on full-disk encryption (at rest) and TLS (in transit). Column-level encryption introduces significant performance overhead and search limitations not required for the current data classification.
    *   **Review Date**: Post-GA (Q1 2026)

## 3. Sunset Conditions
*   Risks are reviewed quarterly.
*   Mitigations are verified via automated tests in `server/src/tests/verification/verify_security_controls.test.ts`.

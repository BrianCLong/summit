# Statement of Work (SOW) - Scope Template
## Summit Platform GA Deployment

---

**Project:** Deployment and Acceptance of the Summit Platform GA Release
**Version:** GA Release as of Commit Hash: `[INSERT GIT COMMIT HASH]`

---

## 1. Scope

### 1.1. In-Scope Capabilities

This Statement of Work covers the deployment, configuration, and acceptance of the **Certified Capabilities** of the Summit Platform General Availability (GA) release, as defined in the `SUMMIT_READINESS_ASSERTION.md` document.

The certified capabilities include:

*   **Identity & Access Management:**
    *   OIDC-based authentication for human operators.
    *   Service-to-service mTLS and token-based security.
    *   RBAC and ABAC policy enforcement via the integrated OPA engine.
*   **Data Ingestion & Integrity:**
    *   The "IntelGraph" ingestion pipeline with strict schema validation.
    *   Immutable provenance tracking for all write operations.
    *   Automated graph database integrity checks.
*   **Orchestration:**
    *   Management of multi-stage analysis workflows via the Maestro Orchestrator.
    *   Persistent and durable job queuing.

### 1.2. Out-of-Scope Capabilities

Any capability not explicitly listed as a "Certified Capability" in the `SUMMIT_READINESS_ASSERTION.md` is considered out of scope for this SOW. This includes, but is not limited to:

*   **Intentionally Deferred Capabilities:**
    *   Autonomous Agent Loop ("Agentic Mesh").
    *   Real-time Cognitive Warfare Defense ("PsyOps").
    *   Predictive Geopolitics ("Oracle").
*   **Features Under Security Hardening:** Any feature directly impacted by the remediation activities detailed in the `SECURITY_APPENDIX.md`.

## 2. Deliverables

The primary deliverables for this project are **verifiable artifacts** that demonstrate the successful deployment and operation of the in-scope capabilities.

| Deliverable ID | Description |
| :--- | :--- |
| D-01 | A deployment of the Summit Platform GA release in the target environment. |
| D-02 | A report confirming the successful execution of the "Golden Path" acceptance tests, as defined in `EVALUATION_LANGUAGE.md`. |
| D-03 | The successful output of the automated security baseline verification script (`pnpm verify`), confirming the 12 core security controls are active. |
| D-04 | A copy of the final, signed-off `SECURITY-ISSUE-LEDGER.md` demonstrating that all critical vulnerabilities have been remediated prior to final acceptance. |

## 3. Acceptance Criteria

Final acceptance of the project will be granted upon the successful validation of the following criteria:

1.  **Deployment:** The Summit Platform is running in the specified target environment.
2.  **Golden Path Verification:** The acceptance tests for the "Golden Path" workflow (ingest, relate, query, verify provenance) complete without errors.
3.  **Security Baseline Verification:** The `pnpm verify` command runs successfully in the deployed environment, showing all 12 security checks as passed.
4.  **Critical Vulnerability Remediation:** The provided `SECURITY-ISSUE-LEDGER.md` shows a "RESOLVED" status for all items previously marked as "CRITICAL".

## 4. Assumptions and Dependencies

*   **Environment:** The customer is responsible for providing a target environment that meets the documented prerequisites for the Summit Platform.
*   **Access:** The deployment team requires the necessary access and permissions to the target environment to fulfill its obligations.
*   **Source of Truth:** The code and documentation at the specified Git commit hash are the single source of truth for this SOW.

## 5. Change Control

Any requested changes to the scope, deliverables, or acceptance criteria defined in this SOW must be submitted through a formal change control process. No changes will be implemented without a mutually signed amendment to this SOW.

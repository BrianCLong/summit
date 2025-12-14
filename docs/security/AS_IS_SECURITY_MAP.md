# As-Is Security & Policy Map

## 1. Secrets Management
*   **Current State**: Secrets are loaded from `process.env` via `server/src/config/index.ts`.
*   **Storage**: Relies on `.env` files and environment variables in deployment.
*   **Risks**:
    *   Default passwords (`devpassword`, `dev_jwt_secret_12345`) are present in `config/index.ts` (though guarded by `REQUIRE_REAL_DBS`).
    *   No centralized secret rotation mechanism.
    *   Secrets are accessed directly via `process.env` in some places (though mostly centralized in `config`).

## 2. Authentication & Authorization
*   **Current State**: Handled by `server/src/services/AuthService.ts`.
*   **AuthN**: JWT-based (Access + Refresh tokens). Argon2 for passwords.
*   **AuthZ**: RBAC with hardcoded roles (`ADMIN`, `ANALYST`, `VIEWER`) in `AuthService.ts`.
*   **Risks**:
    *   Role permissions are hardcoded in code, making them hard to update without deployment.
    *   No fine-grained ABAC (Attribute-Based Access Control).
    *   Tenant isolation relies on manual query filtering (e.g., `WHERE tenant_id = $1`).

## 3. Policy & Governance
*   **Current State**: Some OPA policies exist in `policy/` but integration appears to be largely via CI checks or unused `zero-trust` modules.
*   **Risks**:
    *   No runtime policy enforcement engine (Policy-as-Code) active in the main server path.
    *   Logic is scattered across services/controllers.

## 4. Supply Chain & CI/CD
*   **Current State**:
    *   `pnpm` is used.
    *   GitHub Actions workflows exist (`.github/workflows/`).
    *   Some evidence of OPA usage in archived workflows.
*   **Risks**:
    *   Lack of explicit SBOM generation in active pipelines.
    *   No image signing (Cosign) verification enforced on deployment (implied by task).

## 5. Logging & Audit
*   **Current State**: `logger.ts` (likely Pino) used for application logs.
*   **Risks**:
    *   No dedicated `audit_log` table for immutable security events.
    *   Security events (login success/fail) are logged as standard application logs, mixed with debug info.

## Prioritized Risk List
1.  **Secrets**: Default credentials in code.
2.  **Audit**: Lack of structured, persistent security audit log.
3.  **Policy**: Hardcoded RBAC limits flexibility and visibility.
4.  **Supply Chain**: Missing SBOM/Signing for verifiable provenance.

# Data Access Model (GA Baseline)

## 1. Actors & Roles

### 1.1 Human Actors
*   **User**: Authenticated individual with access to a specific tenant context.
*   **Admin**: Elevated user with permissions to manage tenant configuration and users.
*   **Operator**: Infrastructure-level access (out-of-band), strictly limited to maintenance.

### 1.2 System Actors
*   **Service Accounts**: Internal services performing background tasks (e.g., Maestro, Workers).
*   **External Systems**: Third-party integrations accessing via Webhooks or API Keys.

## 2. Access Control Enforcement

### 2.1 Authentication (AuthN)
*   **Mechanism**: JWT (JSON Web Tokens)
*   **Enforcement Point**: `server/src/middleware/auth.ts` (`ensureAuthenticated`)
*   **Verification**: Validates signature, expiration, and issuer against known keys.

### 2.2 Authorization (AuthZ)
*   **Role-Based (RBAC)**:
    *   **Mechanism**: Role claims in JWT.
    *   **Enforcement Point**: `server/src/middleware/auth.ts` (`ensureRole`, `requirePermission`)
*   **Attribute-Based (ABAC)**:
    *   **Mechanism**: OPA (Open Policy Agent) policies.
    *   **Enforcement Point**: `server/src/policy/enforcer.ts`
*   **Tenant Isolation**:
    *   **Mechanism**: Row-Level Security (logical) via `tenant_id` column.
    *   **Enforcement Point**: Data Access Layer (e.g., `server/src/lib/db/TenantSafePostgres.ts` pattern, implied by codebase structure). All queries must include `tenant_id` predicate.

## 3. Audit & Accountability

### 3.1 Provenance Ledger
*   **Scope**: All data mutations (Create, Update, Delete).
*   **Record**: `server/src/provenance/ledger.ts`
*   **Details**: Actor ID, Action Type, Resource ID, Timestamp, Previous/Current Hash.
*   **Integrity**: Immutable hash chain verification (`verifyChainIntegrity`).

### 3.2 Security Audit
*   **Scope**: Access decisions (Login, Permission Checks, Policy Violations).
*   **Record**: `server/src/audit/advanced-audit-system.ts`
*   **Details**: Event Type, Actor, Outcome, Severity.

## 4. Extension Boundaries
*   **Plugins**: Executed within `PluginSandbox`. Access is limited to declared capabilities.
*   **Direct DB Access**: Prohibited for extensions. Must use Service Layer APIs.

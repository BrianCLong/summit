# Summit Authentication & Authorization Model

**Version:** 1.0
**Target:** Summit Agentic AI OSINT Platform

## 1. Overview
Summit uses a multi-layered identity and access management (IAM) model. Authentication (AuthN) verifies the identity of users and services, while Authorization (AuthZ) controls access to resources based on roles, permissions, and organizational context.

## 2. Authentication (AuthN)

### 2.1 JWT-Based Authentication
Summit uses JSON Web Tokens (JWT) for session management and API authentication.

*   **Access Tokens**: Short-lived (typically 15 minutes) tokens used for individual requests. Signed with RS256 (asymmetric keys).
*   **Refresh Tokens**: Long-lived tokens (7 days) used to obtain new access tokens. Rotated on each use.
*   **Claims**: JWTs include standard claims (`sub`, `iat`, `exp`) and custom Summit claims:
    ```json
    {
      "userId": "usr_123",
      "tenantId": "org_456",
      "role": "ANALYST",
      "permissions": ["investigation:read", "investigation:create"]
    }
    ```

### 2.2 API Keys
For service-to-service communication and external integrations, Summit provides managed API keys.

*   **Rotation**: Keys can be rotated without service interruption.
*   **Scoped Access**: API keys are tied to specific service accounts and limited to specific permissions.
*   **Hashing**: Keys are never stored in plain text; they are hashed (argon2id) at rest.

## 3. Authorization (AuthZ)

### 3.1 Multi-Tenant Isolation
Summit is a multi-tenant platform. The core authorization principle is that users can **never** access data outside their assigned `tenantId`.

*   **Enforcement**: Every graph query and database transaction includes an implicit or explicit tenant filter.
*   **Isolation Clauses**: Neo4j and PostgreSQL queries are wrapped in isolation layers that append `WHERE tenantId = $userTenantId`.

### 3.2 Role-Based Access Control (RBAC)
Summit defines four primary roles with standard permission sets:

| Role | Description | Core Capabilities |
| :--- | :--- | :--- |
| **ADMIN** | System Administrator | Full access to all endpoints, user management, and configuration. |
| **ANALYST** | Lead Researcher | Create/edit investigations, entities, and run simulations. |
| **OPERATOR** | Tactical Analyst | Read data, execute predefined investigations. |
| **VIEWER** | Read-Only | Access to dashboards and completed reports. |

### 3.3 Attribute-Based Access Control (ABAC)
For complex access scenarios (e.g., "high-risk investigations"), Summit uses Open Policy Agent (OPA) to enforce fine-grained, context-aware policies.

*   **Policy Language**: Rego.
*   **Decision Points**: Enforcement happens at the API Gateway and within specific service controllers.

## 4. Key Security Controls

*   **MFA enforcement**: Optional for VIEWERs, mandatory for ADMINs and ANALYSTs in production.
*   **Token Blacklisting**: Revoked tokens (on logout or security event) are stored in a distributed blacklist (Redis) until expiration.
*   **Device Tracking**: Sessions are tied to device fingerprints to detect session hijacking.

## 5. Related Documentation
*   [API Authorization Matrix](./AUTH_MATRIX.md)
*   [RBAC Permissions Map](./RBAC_MATRIX.md)
*   [Security Guidelines](./SECURITY_GUIDELINES.md)

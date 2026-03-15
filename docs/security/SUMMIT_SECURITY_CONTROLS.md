# Summit Security Controls

**Version:** 1.0
**Target:** Summit Agentic AI OSINT Platform

## 1. Overview
Summit implements a defense-in-depth architecture with multiple layers of security controls, including network-level, application-level, and data-level protections.

## 2. Application-Level Controls

### 2.1 Input Validation & Sanitization
*   **Schema-Based Validation (Zod)**: All API endpoints (REST & GraphQL) use strict Zod schemas to validate incoming data types, formats, and lengths.
*   **Sanitization**: User-provided inputs are sanitized before being used in database queries or rendered in the UI to prevent injection and XSS attacks.
*   **Mutation Validators**: Graph mutations are passed through specialized validators to ensure structural and semantic integrity.

### 2.2 Output Sanitization & Security Headers
*   **XSS Prevention**: UI components automatically escape and sanitize output to prevent cross-site scripting (XSS).
*   **Security Headers**: Summit production environments enforce standard security headers via `helmet.js`:
    *   `Strict-Transport-Security (HSTS)`
    *   `X-Frame-Options: DENY`
    *   `X-Content-Type-Options: nosniff`
    *   `Content-Security-Policy (CSP)`
    *   `Permissions-Policy`

### 2.3 Rate Limiting
To prevent denial-of-service (DoS) and brute force attacks, Summit implements tiered rate limiting:

*   **Auth Endpoints**: Strictly limited (e.g., 5 requests per minute per IP).
*   **GraphQL API**: Per-user limits (e.g., 100 requests per minute).
*   **General API**: Window-based limits (e.g., 1000 requests per hour).
*   **Response**: Returns `429 Too Many Requests` with a `Retry-After` header.

## 3. GraphQL-Specific Controls

*   **Query Depth Limiting**: Prevents complex, deeply nested queries that could cause resource exhaustion (Max Depth: 6 in production).
*   **Query Complexity Analysis**: Assigns a weight to each GraphQL field and rejects queries exceeding the complexity threshold (Max Complexity: 1000 in production).
*   **Persisted Queries**: Optional in development, mandatory in production to allow only pre-approved queries.
*   **Introspection**: Disabled in production environments.

## 4. Orchestration & Agent Security

*   **Budget Admission Controller**: Prevents agents from exceeding pre-defined token or compute budgets.
*   **Safety Envelopes (AASF)**: Enforces operational limits and safety criteria for all autonomous agent behavior.
*   **Runaway Control**: Real-time monitoring and throttling of agent actions to prevent runaway automation loops.

## 5. Deployment & Configuration

*   **Secret Management**: Secrets are never hardcoded or logged; they are managed via HashiCorp Vault or AWS KMS and injected at runtime via environment variables.
*   **CORS**: Strictly enforced with explicit origin whitelisting in production.
*   **Dependency Scanning**: Automated daily scans for vulnerable or outdated components (Snyk/Dependabot).

## 6. Related Documentation
*   [Security Guidelines](./SECURITY_GUIDELINES.md)
*   [Auth Model](./SUMMIT_AUTH_MODEL.md)
*   [Threat Model](./SUMMIT_THREAT_MODEL.md)

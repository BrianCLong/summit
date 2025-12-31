# System Threat Model

## 1. Executive Summary

This document defines the formal Threat Model for the IntelGraph platform. It follows the **STRIDE** methodology to categorize threats and maps them to architectural components. The goal is to move from "implicit security" to "explicit, verifiable security controls."

**Scope:**
*   **Trust Boundaries:** API Gateway, Database Access, Agent Execution Environment.
*   **Assets:** Customer Data (Graph), PII, Audit Logs, AI Models.
*   **Actors:** External Users, Internal Admins, Autonomous Agents, Third-Party Webhooks.

---

## 2. Architecture & Data Flow

### 2.1 High-Level Data Flow
1.  **Ingestion:** Data enters via REST API (`/api/ingest`) or Stream (`/api/stream`). Authenticated via JWT.
2.  **Processing:** Validated by `IngestionPipeline`, passed to `Maestro` for agentic reasoning or directly to Storage.
3.  **Storage:**
    *   **Graph:** Neo4j (Tenant-isolated).
    *   **Relational:** PostgreSQL (RLS/Schema-isolated).
    *   **Vector:** Vector Store (Namespace-isolated).
4.  **Consumption:** Users query via GraphQL (`/graphql`) or REST.
5.  **Audit:** All mutations are signed and logged to `ProvenanceLedger`.

### 2.2 Trust Boundaries
*   **Public Internet vs. API Gateway**: The `server` application is the primary gatekeeper.
*   **Application vs. Data Store**: The application holds database credentials; end-users never access DB directly.
*   **Application vs. AI Models**: Calls to LLMs are mediated by `CostMeter` and `PIIGuard`.
*   **Tenant vs. Tenant**: Strictly enforced logic separation; shared infrastructure.

---

## 3. Threat Analysis (STRIDE)

### 3.1 Spoofing (Identity)

| Threat ID | Description | Component | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **S-01** | Attacker mimics a legitimate user using a forged JWT. | `AuthService` | **Control:** JWTs signed with RSA-256 (RS256) from OIDC provider. **Verification:** Signature verification in `productionAuthMiddleware`. | ✅ Protected |
| **S-02** | Developer bypassing auth in Production. | `AuthMiddleware` | **Control:** `NODE_ENV=production` forces strict auth; dev-mode mock user disabled. | ✅ Protected |
| **S-03** | Webhook spoofing (e.g., fake Stripe event). | `Webhooks` | **Control:** Signature verification (HMAC) on webhook payloads. | ✅ Protected |

### 3.2 Tampering (Integrity)

| Threat ID | Description | Component | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | Modification of Audit Logs. | `ProvenanceLedger` | **Control:** Logs are written to WORM-compliant tables (append-only) with cryptographic chaining. | ✅ Protected |
| **T-02** | Supply Chain Injection (malicious npm package). | `Build System` | **Control:** Locked `pnpm-lock.yaml`, SBOM generation, CI dependency scanning. | ✅ Protected |
| **T-03** | Request Body Modification in transit. | `API Gateway` | **Control:** TLS 1.2+ required. `auditFirstMiddleware` captures raw request signature. | ✅ Protected |

### 3.3 Repudiation (Logging)

| Threat ID | Description | Component | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | Admin denies performing a sensitive action. | `AuditSystem` | **Control:** `auditLogger` records `sub`, `tenant_id`, `ip`, and `action` for every write operation. | ✅ Protected |
| **R-02** | AI Agent denies executing a dangerous tool. | `Maestro` | **Control:** All agent tool executions are recorded in the `Activity` stream with input/output snapshots. | ✅ Protected |

### 3.4 Information Disclosure (Privacy)

| Threat ID | Description | Component | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **I-01** | PII leakage to LLM providers. | `LLM Gateway` | **Control:** `piiGuardMiddleware` scans and redacts sensitive entities (Names, SSN, Credit Cards) before upstream transmission. | ✅ Protected |
| **I-02** | Cross-Tenant Data Leak (Tenant A sees Tenant B). | `API/Graph` | **Control:** `tenantContextMiddleware` enforces header consistency. `TenantIsolationGuard` validates access. Database queries inject `tenant_id` clauses. | ✅ Protected |
| **I-03** | Stack trace exposure in API errors. | `ErrorHandler` | **Control:** `centralizedErrorHandler` suppresses stack traces in production (returns generic 500). | ✅ Protected |

### 3.5 Denial of Service (Availability)

| Threat ID | Description | Component | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **D-01** | API Flooding. | `RateLimiter` | **Control:** `advancedRateLimiter` enforces per-IP and per-Tenant quotas. | ✅ Protected |
| **D-02** | Complex GraphQL Query ("DoS by Complexity"). | `GraphQL` | **Control:** `depthLimit` (max depth 6), `rateLimitAndCachePlugin` (complexity scoring), `circuitBreakerMiddleware`. | ✅ Protected |
| **D-03** | LLM Cost Exhaustion (Wallet Drain). | `Maestro` | **Control:** `TenantIsolationGuard` enforces `llmSoftCeiling` and hard caps per tenant. | ✅ Protected |

### 3.6 Elevation of Privilege (Authorization)

| Threat ID | Description | Component | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **E-01** | Standard user accessing Admin API. | `RBAC` | **Control:** `ensureRole('admin')` middleware on `/api/admin/*` and `/api/compliance/*`. | ✅ Protected |
| **E-02** | Tenant User escaping to another Tenant. | `Tenancy` | **Control:** `tenantContextMiddleware` validates that the token claim `tenant_id` matches the route parameter. | ✅ Protected |

---

## 4. Residual Risks

1.  **Insider Threat:** A compromised DB admin has full access. *Mitigation: Database access logging (partial).*
2.  **Zero-Day Dependency:** `pnpm audit` runs in CI, but zero-days exist. *Mitigation: WAF, Runtime protection.*
3.  **Model Hallucination:** Agents may generate incorrect but plausible security assertions. *Mitigation: Human-in-the-loop for high-stakes decisions.*

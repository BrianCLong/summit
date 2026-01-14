# Security & Threat Modeling Packet: Runtime Governance Enforcement

**Status:** ACTIVE
**Owner:** Engineering Orchestrator
**Last Updated:** 2025-10-21
**Scope:** Runtime enforcement of tenant isolation, safety gates, and policy governance.

---

## A) System Summary

### Trust Boundaries
1.  **Client ↔ API:** External traffic enters via Express.js `server/src/app.ts`. Authenticated via JWT (Auth0/Internal).
2.  **API ↔ Middleware:** `tenantContext`, `safetyMode`, and `governance` middleware act as the primary policy enforcement points (PEPs).
3.  **Middleware ↔ Services:** Services assume a validated `TenantContext` object.
4.  **Services ↔ Data Store:** Direct database access (Postgres, Neo4j, Redis) is scoped by `TenantValidator` query constraints.
5.  **Break-Glass:** Elevates privileges via `privilegeTier` in `TenantContext`, bypassing standard checks but requiring enhanced audit.

### Assets
*   **Tenant Data:** Customer PII, knowledge graphs (Neo4j), and vector embeddings.
*   **Audit Logs:** Immutable records of access and policy decisions (Evidence).
*   **Policy Bundles:** Rules defining allowed purposes and legal bases.
*   **Model Weights/Inference:** LLM quotas and access rights.

### Entry Points
*   **REST API:** `/api/*` (Authenticated, Rate-limited).
*   **GraphQL:** `/graphql` (Authenticated, PBAC-enabled).
*   **Webhooks:** `/api/webhooks/*` (External triggers).
*   **Internal Admin:** `/api/admin/*`, `/api/internal/*`.

### Roles & Capabilities
*   **User:** Standard access to own tenant's data.
*   **Admin:** Elevated access within own tenant.
*   **Service (Machine):** API keys/mTLS for backend-to-backend.
*   **Super Admin (Break-Glass):** Cross-tenant access for emergencies (requires `privilegeTier: break-glass`).

---

## B) Threat List (Top 12–18)

| ID | Category | Threat Scenario | Impact | Likelihood | Mitigations | Detections | Tests |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TM-001** | Spoofing | Attacker injects `X-Tenant-ID` on a public route to impersonate a tenant. | High | Med | `ensureTenantConsistency` enforces match between Header, JWT, and Route Param. | `tenant_context_error` logs in `tenantContext.ts`. | `TenantContext.test.ts`: Verify spoofed header throws 409. |
| **TM-002** | Info Disclosure | Cross-tenant data leak via shared Redis cache keys. | High | High | `TenantValidator.getTenantCacheKey` prefixes all keys with `tenant:{id}:`. | Cache miss spikes; Audit log of access. | `TenantValidator.test.ts`: Check key generation format. |
| **TM-003** | Tampering | Global Kill Switch (`KILL_SWITCH_GLOBAL`) bypass via non-mutating method abuse (e.g., GET with side effects). | High | Low | `safetyModeMiddleware` blocks *all* high-risk paths (`/api/ai`, `/api/webhooks`) regardless of method in Safe Mode. | `GLOBAL_KILL_SWITCH_ACTIVE` (503) log events. | `safety-mode.test.ts`: Verify GET to `/api/ai` is blocked in safe mode. |
| **TM-004** | EoP | Admin abuses `privilegeTier=break-glass` to access another tenant's PII without warrant. | Critical | Med | `TenantIsolationGuard` allows access but `auditFirstMiddleware` forces high-severity audit log. | Alert on `privilegeTier: break-glass` in logs. | `TenantIsolationGuard.test.ts`: Verify break-glass is flagged. |
| **TM-005** | Tampering | Cypher injection in Neo4j query via malformed Tenant ID. | Critical | Med | `TenantValidator.addTenantToNeo4jQuery` uses parameterized queries (`$tenantId`), never string concat. | Neo4j query logs showing syntax errors. | `TenantValidator.test.ts`: Attempt injection in tenantId. |
| **TM-006** | DoS | Tenant exhausts LLM budget, starving others. | Med | High | `TenantIsolationGuard.enforceLlmCeiling` enforces hard/soft caps per tenant. | `LLM ceiling reached` (429) metrics. | `TenantIsolationGuard.test.ts`: Mock rate limit exhaustion. |
| **TM-007** | Tampering | Governance Verdict Omission (Fail-Open) if middleware crashes. | High | Low | `centralizedErrorHandler` ensures secure default; `TenantValidator` defaults to `requireExplicitTenant=true`. | Error logs with `tenant_context_error`. | Integration test: Trigger middleware error, verify 500/403. |
| **TM-008** | Repudiation | Evidence falsification by modifying local logs. | Med | Med | `auditFirstMiddleware` and `TelemetryLayer` write to append-only streams/remote SIEM (future). | Hash chain verification (future). | Verify log file integrity. |
| **TM-009** | Spoofing | `X-Purpose` header stripping to bypass governance checks. | Med | Med | `governanceMiddleware` in `strictMode` rejects requests missing headers. | `Invalid governance context` logs. | `governance.test.ts`: Request without headers returns 403. |
| **TM-010** | Info Disclosure | Model access without entitlement (e.g., GPT-4 access on GPT-3 tier). | Med | Med | `TenantPolicyDecision` checks model entitlements against `TenantContext`. | Policy denial logs. | Unit test entitlement logic. |
| **TM-011** | Tampering | Race condition in Kill Switch activation (Time-of-Check vs Time-of-Use). | High | Low | Environment variables (`process.env`) take immediate precedence over async feature flags. | mismatched safety state logs. | Verify Env var update is instant. |
| **TM-012** | DoS | Ingestion API flooding. | Med | High | `enforceIngestionCap` in `TenantIsolationGuard`. | 429 status rate metrics. | Load test ingestion endpoint. |

---

## C) Abuse Cases

### 1. Cross-Tenant Query Attempt
*   **Narrative:** Authenticated user for `Tenant A` modifies their request to send `X-Tenant-ID: Tenant B` while accessing `/api/tenants/TenantA/users`.
*   **System Behavior:** `tenantContextMiddleware` calls `ensureTenantConsistency`. It detects `routeTenant=TenantA` and `headerTenant=TenantB`.
*   **Outcome:** **DENY** (409 Conflict).
*   **Observability:** Log `Tenant identifier mismatch` with `status: 409`.
*   **Reason Code:** `TENANT_MISMATCH`.

### 2. Kill Switch Forced Deny via Config Injection
*   **Narrative:** Attacker gains partial config access and sets `KILL_SWITCH_GLOBAL=true` to cause DoS.
*   **System Behavior:** `safetyModeMiddleware` reads env var. All mutating requests (POST/PUT/DELETE) and `/graphql` mutations are blocked immediately.
*   **Outcome:** **DENY** (503 Service Unavailable).
*   **Observability:** `Request blocked by global kill switch` logs.
*   **Reason Code:** `GLOBAL_KILL_SWITCH_ACTIVE`.

### 3. Break-Glass Replay
*   **Narrative:** A compromised Admin token with `privilegeTier: break-glass` is reused to download bulk PII.
*   **System Behavior:** `TenantValidator` permits the cross-tenant access due to high privilege. However, `auditFirstMiddleware` captures the specific `X-Warrant-Id` and `X-Purpose`.
*   **Outcome:** **ALLOW** (but Detected).
*   **Observability:** High-severity alert triggered by `privilegeTier=break-glass` usage in `audit-events`.
*   **Reason Code:** `BREAK_GLASS_ACCESS`.

### 4. Verdict Stripping by Middleware Bypass
*   **Narrative:** Developer adds a new route `/api/v2/unguarded` before `tenantContextMiddleware` is mounted in `app.ts`.
*   **System Behavior:** `TenantValidator` is NOT called automatically. However, `TenantValidator.validateTenantAccess` inside the service layer throws `GraphQLError: Tenant context required` if context is missing.
*   **Outcome:** **DENY** (500 Internal Error / 400 Bad Request) provided service layer uses `TenantValidator`.
*   **Observability:** Application crash/error log `Tenant isolation violation`.
*   **Reason Code:** `TENANT_REQUIRED`.

---

## D) Security Requirements (Canonical)

| Req ID | Priority | Description | Implementation |
| :--- | :--- | :--- | :--- |
| **SR-001** | **P0** | All API requests MUST have a resolved and consistent `TenantContext`. | `tenantContextMiddleware` |
| **SR-002** | **P0** | Global Kill Switch MUST override all other access policies for mutating requests. | `safetyModeMiddleware` (First in chain) |
| **SR-003** | **P0** | Cross-tenant database queries MUST use parameterized filtering. | `TenantValidator.addTenantToNeo4jQuery` |
| **SR-004** | **P0** | Break-glass access MUST trigger a distinct high-severity audit event. | `auditFirstMiddleware` |
| **SR-005** | **P1** | Tenant-scoped cache keys MUST use a standardized prefix. | `TenantValidator.getTenantCacheKey` |
| **SR-006** | **P1** | Governance headers (`X-Purpose`) MUST be validated in Strict Mode for sensitive data. | `governanceMiddleware` |
| **SR-007** | **P1** | High-risk API paths (`/api/ai`, `/api/webhooks`) MUST be blockable via `SAFE_MODE`. | `safetyModeMiddleware` |
| **SR-008** | **P1** | GraphQL mutations MUST be blocked by Kill Switch. | `safetyModeMiddleware` (Introspection check) |
| **SR-009** | **P2** | Ingestion endpoints MUST enforce tenant-specific rate limits. | `TenantIsolationGuard.enforceIngestionCap` |
| **SR-010** | **P2** | LLM usage MUST respect soft and hard ceilings per tenant. | `TenantIsolationGuard.enforceLlmCeiling` |

---

## E) PR Review Checklist (Security)

**Reviewer: Ensure these points are verified before merging.**

*   [ ] **Tenant Scoping:**
    *   Does the new route/service use `TenantValidator`?
    *   Are DB queries filtered by `$tenantId`?
    *   Are cache keys prefixed with `tenant:{id}`?
*   [ ] **Kill Switch Compliance:**
    *   If this is a mutating endpoint, is it blocked by `KILL_SWITCH_GLOBAL`?
    *   If this is a new high-risk subsystem, is it listed in `SAFE_MODE_BLOCKED_PREFIXES`?
*   [ ] **Governance:**
    *   Does the endpoint require `X-Purpose` or `X-Warrant-Id`?
    *   Are governance headers passed through to downstream services?
*   [ ] **Evidence & Logging:**
    *   Are critical decisions (Allow/Deny) logged with `reasonCode`?
    *   Is PII redacted from logs (no raw payloads in `info` logs)?
*   [ ] **Break-Glass:**
    *   Does the code handle `privilegeTier` correctly? (No implicit elevation).

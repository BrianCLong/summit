# External Security Review Packet

**Version:** 1.0.0
**Date:** October 2025
**Classification:** Confidential - Reviewer Eyes Only

---

## 1. Introduction

This packet provides external security auditors, red teams, and compliance reviewers with the necessary context to evaluate the IntelGraph platform.

**System Overview:**
IntelGraph is a multi-tenant graph intelligence platform integrating Data Ingestion, autonomous AI Agents ("Maestro"), and Neo4j-based graph storage. It is designed for high-assurance environments.

---

## 2. Key Documentation Links

*   [**Threat Model**](./THREAT_MODEL.md): Analysis of architectural threats and mitigations.
*   [**Attack Surface**](./ATTACK_SURFACE.md): Complete enumeration of entry points.
*   [**Threat Control Matrix**](./THREAT_CONTROL_MATRIX.md): Detailed mapping of risks to controls.
*   [**Architecture**](../../ARCHITECTURE.md): High-level system design.
*   [**Authentication**](../../services/AuthService.ts): (Source) JWT implementation details.

---

## 3. Security Architecture Highlights

### 3.1 Authentication & Authorization
*   **Identity:** OIDC-compliant JWTs (RS256).
*   **RBAC:** Role-based access control enforced via `ensureRole` middleware and OPA policies.
*   **Multi-Tenancy:** Hard isolation enforced by `tenantContextMiddleware`. A mismatch between the Token's `tenant_id` claim and the Route's `tenantId` parameter results in an immediate 403.

### 3.2 Data Protection
*   **Encryption at Rest:** All databases (Postgres, Neo4j, Redis) use volume-level encryption.
*   **Encryption in Transit:** TLS 1.2+ required for all inbound/outbound traffic.
*   **PII Redaction:** `piiGuardMiddleware` proactively scans request bodies and redacts sensitive entities before they reach business logic or LLMs.

### 3.3 Audit & Provenance
*   **Immutable Ledger:** Critical actions are logged to `ProvenanceLedger`, forming a cryptographically verifiable chain of custody.
*   **WORM Storage:** Audit logs are strictly append-only.

---

## 4. How to Verify (Red Team Guide)

### 4.1 Setup
1.  Provision a `test` tenant.
2.  Provision a `target` tenant (victim).
3.  Obtain JWTs for users in both tenants.

### 4.2 Targeted Tests
1.  **Tenant Escape:** Attempt to access `/api/tenants/{target_id}/billing` using the `test` user's token.
    *   *Expected Result:* 403 Forbidden ("Cross-tenant access denied").
2.  **PII Leak:** Send a payload containing a fake SSN to `/api/maestro/chat`.
    *   *Expected Result:* The LLM should receive `[REDACTED-SSN]`, not the actual number. Verify in `audit_events` table.
3.  **Rate Limiting:** Blast `/graphql` with 1000 requests in 1 second.
    *   *Expected Result:* 429 Too Many Requests after ~100 requests.

---

## 5. Known Limitations (Out of Scope)
*   Physical security of the data center (AWS/Azure responsibility).
*   Social engineering of support staff.
*   Client-side attacks on end-user machines (malware).

# Summit Threat Model & Attack Surface Analysis

## 1. Introduction

This document defines the threat landscape for Summit as of the "Formal Red-Team" sprint. It enumerates attacker classes, attack surfaces, and assumptions. This serves as the basis for adversarial testing.

## 2. Attacker Classes

We assume the following distinct adversary types:

### 2.1. The Malicious Tenant (Insider Threat A)
*   **Profile**: A legitimate user of a valid tenant organization.
*   **Goal**: Access data belonging to other tenants, elevate privileges within their own tenant beyond their role, or exhaust platform resources to deny service to others.
*   ** Capabilities**:
    *   Authenticated access to standard APIs.
    *   Ability to manipulate request headers (e.g., `x-tenant-id`).
    *   Ability to inject malicious payloads into user-supplied fields (e.g., names, descriptions, scripts).
    *   Ability to trigger resource-intensive operations (batch jobs, complex graph queries).

### 2.2. The Compromised Extension (Supply Chain Threat)
*   **Profile**: A 3rd-party integration or plugin running with scoped privileges.
*   **Goal**: Exfiltrate data it has access to, or pivot to access data it *should not* have access to.
*   **Capabilities**:
    *   API access via Service Account or API Key.
    *   Webhooks ingestion.

### 2.3. The External API Abuser (The "Public" Threat)
*   **Profile**: An unauthenticated or low-privilege attacker hitting public endpoints.
*   **Goal**: DoS the platform, bypass authentication, or exploit public-facing logic (e.g., sign-up flows, password reset).
*   **Capabilities**:
    *   High-volume network requests.
    *   Fuzzing public inputs.

### 2.4. The Over-Privileged Admin (Insider Threat B)
*   **Profile**: A legitimate support user or admin with elevated permissions.
*   **Goal**: (Simulated) Access tenant data without an audit trail.
*   **Capabilities**:
    *   Access to internal admin tools.
    *   "Break-glass" capabilities.

## 3. Attack Surface Inventory

### 3.1. Public APIs (Unauthenticated)
*   `POST /auth/login`
*   `POST /auth/signup`
*   `POST /auth/verify-email`
*   `POST /webhooks/*` (Ingestion endpoints)

### 3.2. Protected APIs (Authenticated)
*   `GET /api/tenants/*` - Critical for isolation checks.
*   `POST /api/maestro/runs` - Remote Code Execution (RCE) risk via workflow payloads.
*   `GET /api/search` - Data leakage risk via shared search indices.
*   `POST /api/graph/*` - Denial of Service (DoS) risk via complex Cypher queries.

### 3.3. Data Ingestion & Processing
*   **File Uploads**: Malicious file parsing (CSV, JSON, PDF).
*   **Webhook Payloads**: Injection attacks via oversized or malformed JSON.

### 3.4. Identity & Access Management
*   **JWT Handling**: Token forgery, replay, weak signing key.
*   **RBAC**: Logic flaws in `server/src/auth/multi-tenant-rbac.ts`.
*   **OPA**: Policy bypass via missing context in input.

## 4. Key Security Assumptions (To Be Tested)

1.  **Tenant Isolation**: A user with a valid JWT for Tenant A cannot read/write data for Tenant B, even if they know the ID of Tenant B's resource.
2.  **Resource Ownership**: The backend validates that `resource_id` belongs to `tenant_id` before performing actions.
3.  **Role Enforcement**: A `viewer` cannot perform `write` actions, even by calling the API directly.
4.  **Quota Enforcement**: A single tenant cannot consume 100% of CPU/RAM/DB connections.
5.  **Audit Integrity**: Critical actions (cross-tenant access, admin overrides) are always logged and cannot be deleted by the actor.

## 5. Non-Goals (Out of Scope)
*   Physical security of the data center.
*   Social engineering of Summit employees.
*   DDoS attacks against the network layer (Cloudflare/AWS responsibility), though *application-layer* DoS is in scope.


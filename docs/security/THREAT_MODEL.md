# Repo-Wide Threat Model

**Target:** Summit + Maestro + CompanyOS
**Date:** October 2025
**Scope:** Server, Client, Orchestration, AI Services

## 1. LLM Attack Surfaces

### 1.1 Prompt Injection
*   **Vector:** User inputs (e.g., search queries, support tickets) are directly interpolated into LLM prompts.
*   **Impact:** Jailbreaking, system instruction override, data leakage.
*   **Mitigation:** Input sanitization (stripping delimiters), output validation (checking for specific refusal tokens), and prompt separation (System vs User roles).

### 1.2 Model Inversion / Extraction
*   **Vector:** Repeated queries to the `GeopoliticalOracleService` or `DefensivePsyOpsService`.
*   **Impact:** Reconstructing the training data or system prompts.
*   **Mitigation:** Rate limiting (API & Token based), specific strict limits for "Oracle" type services.

### 1.3 Excessive Token Consumption (DoS)
*   **Vector:** Sending massive inputs to token-counting services.
*   **Impact:** Financial exhaustion (burning budget).
*   **Mitigation:** `BudgetAdmissionController` with hard stops and atomic reservation.

## 2. API Injection Vectors

### 2.1 Cypher/Graph Injection
*   **Vector:** Malicious inputs in GraphRAG or Knowledge Graph endpoints.
*   **Impact:** Unintended modification or deletion of graph nodes/edges.
*   **Mitigation:** Strict use of Neo4j parameters (`$param`). `MutationValidators` with regex for inputs.

### 2.2 Server-Side Request Forgery (SSRF)
*   **Vector:** Webhook endpoints or "Fetch URL" features in `OSINTService`.
*   **Impact:** Access to internal metadata services (AWS IMDS, K8s API).
*   **Mitigation:** `URLSchema` validation blocking localhost/private IPs. Egress filtering.

## 3. Orchestration Abuse Vectors

### 3.1 Job Queue Flooding
*   **Vector:** submitting thousands of "light" runs to `Maestro`.
*   **Impact:** Starvation of legitimate jobs, Redis memory exhaustion.
*   **Mitigation:** Tenant-based quotas, queue depth monitoring, specific `run:create` permissions.

### 3.2 Race Conditions
*   **Vector:** Simultaneous requests checking budget limits.
*   **Impact:** Exceeding financial caps significantly.
*   **Mitigation:** Atomic check-and-increment (Lua script or Redis transactions).

## 4. Impersonation & Auth Risks

### 4.1 Token Theft
*   **Vector:** XSS in the frontend stealing `localStorage` tokens.
*   **Impact:** Account takeover.
*   **Mitigation:** `HttpOnly` cookies for refresh tokens (planned), short-lived access tokens.

### 4.2 Tenant Confusion
*   **Vector:** Manipulating `X-Tenant-ID` header (if allowed in prod).
*   **Impact:** Accessing another tenant's data.
*   **Mitigation:** Strictly deriving `tenantId` from the signed JWT in production (`req.user.tenantId`).

## 5. Data Exfiltration Paths

### 5.1 Logging Sensitive Data
*   **Vector:** Logging full request bodies or headers.
*   **Impact:** Leaking API keys, PII, or auth tokens into Datadog/Splunk.
*   **Mitigation:** `pino-http` redaction rules, PII scrubbing middleware.

### 5.2 Error Messages
*   **Vector:** Verbose stack traces in GraphQL errors.
*   **Impact:** Revealing internal paths and logic.
*   **Mitigation:** `formatError` masking in production Apollo Server config.

## 6. Supply Chain Attacks

### 6.1 Malicious Dependencies
*   **Vector:** Compromised npm package.
*   **Impact:** RCE during build or runtime.
*   **Mitigation:** `pnpm-lock.yaml` enforcement, dependency scanning.

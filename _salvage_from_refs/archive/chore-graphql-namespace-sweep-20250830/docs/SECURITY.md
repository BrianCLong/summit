# IntelGraph Security Overview

This document outlines the security posture, threat model, access control mechanisms, and data flow considerations for the IntelGraph platform, with a focus on the AI Assistant pipeline.

## 1. Threat Model (AI Assistant Pipeline)

**Assets:**
*   User queries (input)
*   Assistant responses (output)
*   Enriched graph data (Neo4j nodes/edges)
*   Audit logs (Postgres)
*   Authentication tokens (JWTs)
*   API keys/credentials for LLMs, Redis, Neo4j, Postgres

**Threat Actors:**
*   Malicious external users (e.g., prompt injection attackers, unauthorized access attempts)
*   Compromised internal users/accounts
*   Malicious insiders
*   Vulnerable third-party dependencies

**Attack Vectors:**
*   **Prompt Injection:** Malicious input designed to bypass LLM safety mechanisms or extract sensitive information.
*   **Unauthorized Access:** Attempting to access assistant features or data without proper authentication/authorization.
*   **Data Exfiltration:** Extracting sensitive data from responses, audit logs, or the graph database.
*   **Denial of Service (DoS):** Overwhelming the assistant service or its dependencies (LLM, Redis, Neo4j, Postgres).
*   **Supply Chain Attacks:** Compromising dependencies (npm, pnpm, pip packages) to inject malicious code.
*   **API Abuse:** Exploiting rate limits or misconfigurations.

**Mitigations:**
*   **Input Validation & Sanitization:** Prompt injection guardrails (`isSuspicious`).
*   **Authentication & Authorization (RBAC):** JWT-based authentication, `graph:write` scope for sensitive mutations.
*   **Rate Limiting:** Tenant-aware rate limits to prevent abuse and DoS.
*   **Data Encryption:** Data in transit (TLS/SSL) and at rest (disk encryption).
*   **Auditing:** Comprehensive audit logging of assistant interactions.
*   **Secrets Management:** Environment variables, secure injection into containers.
*   **Dependency Scanning:** SCA/SAST in CI pipeline.
*   **Network Segmentation:** Isolating services within Kubernetes/VPC.

## 2. Authentication and Authorization (RBAC Matrix)

IntelGraph uses JWTs for authentication. Authorization is managed via scopes embedded in the JWT payload.

| Feature/Action             | Required Scope(s) | Description                                                              |
| :------------------------- | :---------------- | :----------------------------------------------------------------------- |
| `/assistant/*` endpoints   | `assistant:use`   | Access to AI Assistant streaming and response generation.                |
| `suggestions` query        | `assistant:read`  | View pending AI suggestions.                                             |
| `acceptSuggestion` mutation| `graph:write`     | Materialize AI suggestions into the graph.                               |
| `rejectSuggestion` mutation| `graph:write`     | Reject AI suggestions.                                                   |
| `/metrics` endpoint        | `metrics:read`    | Access to Prometheus metrics for monitoring.                             |
| `/healthz` endpoint        | `public`          | Basic health check for load balancers/orchestrators.                     |

**Note:** The `auth` middleware in `server/src/middleware/auth.ts` enforces JWT validation. Specific scope checks are implemented in GraphQL resolvers and API handlers.

## 3. Data Flows and PII Handling

**Data Flow:**
1.  **Client**: User input (query) → `EnhancedAIAssistant` → Transport (Fetch/SSE/Socket.IO).
2.  **Server (API)**: Transport receives input → `requestId` → `auth` → `rateLimit` → `isSuspicious` guard → Cache check.
3.  **LLM Interaction**: If not cached, input sent to LLM (`MockLLM` or external provider) → Streamed tokens received.
4.  **Server (API)**: Tokens streamed back to client; full response buffered for cache and enrichment.
5.  **Audit Logging**: Request details, input, tokens, duration, status logged to Postgres `assistant_audit` table.
6.  **Enrichment Queue**: `EnrichJob` (input, output preview, `reqId`, `userId`, `investigationId`) enqueued to BullMQ.
7.  **Enrichment Worker**: Processes job → extracts entities (NLP) → upserts `AISuggestion` nodes in Neo4j.
8.  **Client (UI)**: `AIGraphSuggestionsPanel` queries GraphQL for `AISuggestion` nodes.
9.  **GraphQL API**: Resolvers query Neo4j, enforce RBAC, and return suggestions.
10. **Client (UI)**: User accepts/rejects suggestion → GraphQL mutation.
11. **GraphQL API**: Mutation updates `AISuggestion` status in Neo4j, materializes `Entity` nodes if accepted.

**PII Handling:**
*   **Input/Output:** User queries and assistant responses may contain PII. These are processed by the LLM and stored in audit logs and potentially in `AISuggestion` nodes.
*   **Audit Logs:** `assistant_audit` table stores `user_id` and `input`. PII scrubbing should be applied before logging if sensitive data is expected.
*   **Graph Data:** `AISuggestion` and `Entity` nodes may contain PII (e.g., names, emails). Implement data masking or tokenization for sensitive attributes.
*   **Right to Erasure (DSAR):** Provided Cypher/SQL utilities (`DSAR / Erasure snippets` in `server/RUNBOOKS.md`) allow for deletion of user-specific data from Neo4j and Postgres.
*   **Data Retention:** Scheduled jobs (`purgeOldSuggestions`) to automatically delete old `AISuggestion` data.

## 4. Secrets Management

*   **Environment Variables:** All sensitive credentials (JWT keys, database URLs, API keys) are loaded via environment variables (`process.env`).
*   **Secure Injection:** In production Kubernetes environments, these should be injected as Kubernetes Secrets.
*   **Rotation:** Establish a regular cadence for rotating all secrets.

## 5. Supply Chain Security

*   **Dependency Scanning:** Integrate SCA (Software Composition Analysis) tools (e.g., Snyk, Trivy) into the CI pipeline to identify known vulnerabilities in third-party libraries.
*   **Static Analysis:** Integrate SAST (Static Application Security Testing) tools (e.g., SonarQube, Bandit) to detect security flaws in custom code.
*   **SBOM (Software Bill of Materials):** Generate and publish SBOMs for all deployed artifacts to maintain an inventory of components.

## 6. Network Security

*   **TLS/SSL:** All external communication (client-server, API-LLM) must use TLS/SSL.
*   **Firewalls/Security Groups:** Restrict network access to only necessary ports and IP ranges.
*   **Ingress/API Gateway:** Use an API Gateway (e.g., Nginx, Envoy) to handle authentication, rate limiting, and request routing before traffic reaches the application servers.
*   **Network Segmentation:** Deploy services in isolated network segments (e.g., Kubernetes namespaces, VPC subnets) to limit lateral movement in case of a breach.

## 7. Incident Response

*   **Monitoring & Alerting:** Comprehensive monitoring (Prometheus, Grafana) and alerting (PagerDuty, Slack) for security-related metrics (e.g., failed logins, suspicious input detections, high error rates).
*   **Runbooks:** Detailed runbooks for security incidents (e.g., suspected prompt injection, unauthorized access attempts).
*   **Forensics:** Ensure logging is sufficient for post-incident forensic analysis.

---

## Contact

For security concerns or incidents, contact the IntelGraph Security Team immediately.

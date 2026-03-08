# Repo-Wide Threat Model

**Version:** 0.1
**Target:** Summit + Maestro + CompanyOS
**Date:** October 2025
**Scope:** Server, Client, Orchestration, AI Services
**Owner:** Security Engineering (U-Series)

## 1. Assets
What are we protecting?

*   **Customer Data**: PII (Names, Emails), Proprietary Knowledge Graphs, Ingested Documents, Behavioral Telemetry.
*   **Intellectual Property**: System Prompts (PsyOps, Oracle), Proprietary Algorithms, internal "Black Project" code.
*   **Compute Resources**: LLM Token Budgets, Cloud Infrastructure (AWS/K8s), Database IOPS.
*   **Audit Trails**: Provenance Ledger, Security Logs, Compliance Artifacts (SOC2 evidence).
*   **System Integrity**: The correctness of the Knowledge Lattice and decision-making logic.

## 2. Actors
Who interacts with the system?

*   **External Analysts (Users)**: Authenticated users accessing the web UI to run queries and simulations.
*   **Internal Operators (Admins)**: DevOps/SREs with privileged access to infrastructure and prod DBs.
*   **Automated Agents**: "Codex" agents, background workers, and schedulers (Maestro) operating with service accounts.
*   **Third-Party Services**: External APIs (OpenAI, Anthropic), Managed Databases (Neo4j Aura, RDS).
*   **Malicious Actors**: External attackers, compromised insiders, or compromised dependencies.

## 3. Trust Boundaries
Where does trust end?

*   **Browser / Server (The API Boundary)**: All input from the client (web, mobile, CLI) is untrusted. Must be validated by Zod schemas and sanitizers.
*   **Server / LLM Provider (The Egress Boundary)**: We trust the provider (e.g., OpenAI) not to leak data deliberately, but we **do not trust** the model output to be safe (Prompt Injection response). All LLM output is treated as potentially tainted.
*   **Server / Database**: Trusted internal network (VPC), but access requires authentication (mTLS/Credentials).
*   **Service / Service**: Currently effectively flat internal trust (within K8s namespace). Planned move to Zero Trust (mTLS + OPA per hop).
*   **Connectors / External Web**: Untrusted. OSINT connectors fetching URLs must be sandboxed to prevent SSRF and malware ingress.

## 4. Attack Surfaces

### 4.1 LLM Attack Surfaces
*   **Prompt Injection**: User inputs (search queries, tickets) injected into prompts.
    *   *Mitigation*: Input sanitization, delimiters, system/user role separation.
*   **Model Inversion**: Repeated queries to Oracle/PsyOps services to extract training data.
    *   *Mitigation*: Rate limiting (Token/Request based), anomaly detection.
*   **Token Exhaustion (DoS)**: Massive inputs sent to token-counting services.
    *   *Mitigation*: `BudgetAdmissionController`, strict quotas.

### 4.2 API Injection Vectors
*   **Cypher/Graph Injection**: Malicious inputs in GraphRAG endpoints.
    *   *Mitigation*: Neo4j parameters (`$param`), `MutationValidators`.
*   **SSRF**: Webhook endpoints or "Fetch URL" features.
    *   *Mitigation*: `URLSchema` validation (no localhost/private IPs), egress filtering.

### 4.3 Orchestration Abuse
*   **Queue Flooding**: Submitting thousands of "light" runs to Maestro.
    *   *Mitigation*: Tenant-based quotas, queue depth monitoring.
*   **Race Conditions**: Simultaneous requests checking budget limits.
    *   *Mitigation*: Atomic check-and-increment (Lua/Redis).

### 4.4 Impersonation & Auth
*   **Token Theft**: XSS stealing `localStorage` tokens.
    *   *Mitigation*: Short-lived access tokens, `HttpOnly` refresh cookies (planned).
*   **Tenant Confusion**: Manipulating `X-Tenant-ID`.
    *   *Mitigation*: Deriving `tenantId` strictly from signed JWT `req.user.tenantId`.

### 4.5 Data Exfiltration
*   **Logging Leakage**: Logging full request bodies/headers (Secrets/PII).
    *   *Mitigation*: `pino-http` redaction, PII scrubbing.
*   **Verbose Errors**: Stack traces in GraphQL errors.
    *   *Mitigation*: `formatError` masking in production.

### 4.6 Supply Chain
*   **Malicious Dependencies**: Compromised npm/pypi packages.
    *   *Mitigation*: `pnpm-lock.yaml`, dependency auditing (Wave U).

## 5. Top Threats & Mitigations
| Threat ID | Description | Likelihood | Impact | Mitigation Status |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | **Prompt Injection** leading to data leak | High | High | Partial (Sanitization) |
| **T-02** | **Tenant Cross-Talk** via Graph Query | Low | Critical | Strong (Tenant Isolation Clauses) |
| **T-03** | **Budget Exhaustion** via DoS | Medium | Medium | Strong (Quota Manager) |
| **T-04** | **Secret Leakage** in Logs | Medium | High | Partial (Redaction Policy needed) |
| **T-05** | **Malicious Dependency** | Low | Critical | Weak (Manual audit only) |

## 6. Known Gaps
Current security gaps identified for remediation in Wave U.

1.  **Dependency Auditing**: Currently manual. No automated alerts for new vulnerabilities.
2.  **Secret Scanning**: No pre-commit or CI check for secrets. Reliance on developer discipline.
3.  **SAST Baseline**: Minimal linting for security patterns (e.g., `no-eval`, unsafe regex).
4.  **Incident Runbook**: No formalized process for security incidents or vulnerability disclosure.
5.  **Log Redaction**: Inconsistent application of redaction rules across services.

## 7. Next Hardening Steps (Wave U)
Roadmap for immediate security improvements.

1.  **Automate Dependency Audit**: Implement warn-only check in CI (U3).
2.  **Implement Secret Scanning**: Add `secret-scan` script and CI job (U4).
3.  **Establish Security Gates**: Create a "sec-verify" aggregator (U5).
4.  **Harden SAST**: Add security-focused ESLint rules (U6).
5.  **Formalize Documentation**: Publish Incident Runbook, Vuln Disclosure, and Log Redaction Policy (U7, U8).

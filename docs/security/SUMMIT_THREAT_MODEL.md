# Summit Threat Model

**Version:** 1.0
**Target:** Summit Agentic AI OSINT Platform
**Status:** Canonical Threat Model

## 1. Overview
This document defines the threat model for the Summit platform, identifying key assets, actors, trust boundaries, and attack surfaces. It provides a structured analysis of threats across the entire agentic AI lifecycle: design, verification, governance, simulation, and runtime control.

## 2. Assets
Summit protects several classes of high-value assets:

*   **Intelligence Data**: Proprietary knowledge graphs, ingested documents, and behavioral telemetry.
*   **Identity & Credentials**: PII (Names, Emails), API keys, JWT secrets, and service account credentials.
*   **Intellectual Property**: System prompts, agent configurations, and proprietary analysis algorithms.
*   **Infrastructure & Resources**: LLM token budgets, compute resources (AWS/K8s), and database IOPS.
*   **Audit Integrity**: The Provenance Ledger, security audit logs, and compliance evidence.

## 3. Actors
*   **Analysts (Users)**: Authenticated users who run queries, investigations, and simulations.
*   **Operators (Admins)**: Privileged users with access to infrastructure and system configuration.
*   **Autonomous Agents**: Background workers (e.g., Codex, Maestro) operating via service accounts.
*   **External Service Providers**: LLM providers (OpenAI, Anthropic), managed database providers (Neo4j Aura).
*   **Adversaries**: External attackers, compromised insiders, or malicious third-party dependencies.

## 4. Trust Boundaries
Summit enforces security at several critical boundaries:

*   **API Gateway (Boundary 1)**: All input from web, mobile, or CLI clients is untrusted and must be validated and sanitized.
*   **LLM Interface (Boundary 2)**: Outputs from Large Language Models are treated as untrusted (potential prompt injection/hallucination) and must pass through safety guardrails.
*   **VPC / Internal Network (Boundary 3)**: Internal service-to-service communication is mutually authenticated (mTLS) in zero-trust configurations.
*   **Ingestion Connectors (Boundary 4)**: Data fetched from external OSINT sources is untrusted and sandboxed to prevent SSRF and malware ingress.

## 5. Attack Surfaces & Threat Classes

### 5.1 Agentic & LLM Threats
*   **Prompt Injection**: Malicious user input designed to hijack agent behavior or extract sensitive system prompts.
    *   *Mitigation*: Strict input/output validation, system/user role separation, and deterministic guardrails.
*   **Runaway Automation**: Agents repeatedly executing actions beyond intended limits (e.g., API loops).
    *   *Mitigation*: Runtime throttling (ASCP), safety envelopes (AASF), and runaway simulations (ARS-Lab).
*   **Model Inversion**: Targeted queries to extract training data or proprietary knowledge from the system.
    *   *Mitigation*: Rate limiting and anomaly detection on query patterns.

### 5.2 API & Data Threats
*   **Injection (Graph/SQL/NoSQL)**: Malicious inputs in search or GraphRAG endpoints.
    *   *Mitigation*: Parameterized queries, Zod schema validation, and mutation validators.
*   **Tenant Cross-Talk**: Unauthorized access to data belonging to another organization.
    *   *Mitigation*: Strict tenant isolation clauses in all database queries and signed JWT claims.
*   **SSRF**: Exploiting ingestion connectors to access internal metadata services or private networks.
    *   *Mitigation*: URL schema validation (no private/reserved IPs) and egress filtering.

### 5.3 Systemic & Orchestration Threats
*   **Cascading Failures**: A failure in one automation propagates across dependent systems.
    *   *Mitigation*: Dependency graph analysis and runtime containment.
*   **Resource Exhaustion (DoS)**: Overwhelming the system with complex graph queries or massive automation jobs.
    *   *Mitigation*: Budget admission controllers, strict quotas, and queue depth monitoring.
*   **Supply Chain Attacks**: Compromise of third-party dependencies or build tools.
    *   *Mitigation*: Dependency auditing, SLSA Level 3 compliance, and signed provenance for all builds.

## 6. Threat Matrix (MAESTRO Aligned)

| Threat ID | Category | Likelihood | Impact | Mitigation Status |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | Prompt Injection | High | High | Implemented (Guardrails) |
| **T-02** | Tenant Confusion | Low | Critical | Implemented (Isolation) |
| **T-03** | Runaway Agents | Medium | Medium | Implemented (Throttling) |
| **T-04** | SSRF via Connectors| Medium | High | Implemented (Egress Filter) |
| **T-05** | Graph Injection | Medium | High | Implemented (Parametrization)|

## 7. Safety Guarantees
Summit provides deterministic safety guarantees via its core layers:

1.  **Automation Scale Analyzer**: Safe scaling architecture verification.
2.  **AASF**: Operational safety and safety envelope enforcement.
3.  **ASGCE**: Governance policy enforcement and audit trail generation.
4.  **ARS-Lab**: Catastrophic risk simulation (runaway, cascade, exhaustion).
5.  **ASCP**: Runtime safety intervention (throttle, pause, shutdown).

## 8. Related Documentation
*   [Security Guidelines](./SECURITY_GUIDELINES.md)
*   [Auth Model](./SUMMIT_AUTH_MODEL.md)
*   [Data Handling](./SUMMIT_DATA_HANDLING.md)
*   [MAESTRO Framework](./threat-modeling-framework.md)

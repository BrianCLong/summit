# Security Threat Model

**Version:** 1.0.0
**Status:** Authoritative
**Last Updated:** Sprint N+10

## 1. Executive Summary

This document defines the authoritative threat model for the Summit platform. It identifies assets, trust boundaries, threat actors, and attack surfaces, providing a structured analysis of risks and their mitigations. This model drives security architecture decisions and regression testing.

## 2. Assets & Data Classification

| Asset                   | Classification      | Description                                                                                  |
| :---------------------- | :------------------ | :------------------------------------------------------------------------------------------- |
| **Intelligence Graph**  | **Top Secret**      | The core knowledge base (Neo4j). Contains inferred relationships and raw intelligence.       |
| **User Profiles**       | **Confidential**    | User PII, credentials, and access logs (PostgreSQL).                                         |
| **Audit Logs**          | **Restricted**      | Immutable record of all system mutations and access. Critical for non-repudiation.           |
| **Agent Prompts**       | **Confidential**    | System prompts and agent configurations (Intellectual Property).                             |
| **Release Pipeline**    | **Critical**        | CI/CD workflows, build artifacts, and signing keys.                                          |
| **Governance Policies** | **Public/Internal** | OPA policies defining access control (Public for transparency, Internal for specific rules). |

## 3. Trust Boundaries

- **External vs. Edge:** The boundary between the public internet and the API Gateway / Load Balancer.
- **Edge vs. App:** The boundary between the Gateway and internal services (Server, Maestro).
- **App vs. Data:** The boundary between application logic and persistence layers (Neo4j, Postgres, Redis).
- **App vs. Agents:** The boundary between the Orchestrator and autonomous agents (LLMs).
- **Control Plane vs. Data Plane:** Separation of management traffic from user traffic.

## 4. Threat Actors

| Actor                 | Capability | Motivation                                                     |
| :-------------------- | :--------- | :------------------------------------------------------------- |
| **External Attacker** | High       | Data theft, service disruption, reputation damage.             |
| **Malicious Insider** | High       | Data theft, sabotage, espionage.                               |
| **Compromised Agent** | Medium     | Privilege escalation, data exfiltration via side channels.     |
| **Negligent User**    | Low        | Accidental data leak, policy violation.                        |
| **Supply Chain**      | High       | Injecting malicious code into dependencies or build artifacts. |

## 5. Threat Analysis (STRIDE)

### 5.1 Spoofing (Identity)

| Threat                    | Severity | Mitigation                                 | Status                |
| :------------------------ | :------- | :----------------------------------------- | :-------------------- |
| **User Impersonation**    | Critical | OIDC/JWT with short expiry (1h).           | Mitigated             |
| **Service Impersonation** | High     | mTLS for service-to-service communication. | Planned (Sprint N+11) |
| **Agent Impersonation**   | High     | Cryptographic agent identity attestation.  | Partially Mitigated   |

### 5.2 Tampering (Data Integrity)

| Threat                       | Severity | Mitigation                                                          | Status    |
| :--------------------------- | :------- | :------------------------------------------------------------------ | :-------- |
| **Graph Manipulation**       | Critical | All mutations require signed provenance.                            | Mitigated |
| **Audit Log Tampering**      | Critical | Append-only logs, WORM storage (simulated), cryptographic chaining. | Mitigated |
| **Build Artifact Injection** | Critical | SLSA Level 3 compliance, SBOM verification, Cosign signing.         | Mitigated |

### 5.3 Repudiation (Action Denial)

| Threat                  | Severity | Mitigation                                        | Status    |
| :---------------------- | :------- | :------------------------------------------------ | :-------- |
| **Admin Action Denial** | High     | Comprehensive audit logging with correlation IDs. | Mitigated |
| **Agent Action Denial** | Medium   | Full trace of agent reasoning and tool execution. | Mitigated |

### 5.4 Information Disclosure (Data Leakage)

| Threat             | Severity | Mitigation                                             | Status    |
| :----------------- | :------- | :----------------------------------------------------- | :-------- |
| **Graph Leakage**  | Critical | OPA-based ABAC, Row/Field-level security in resolvers. | Mitigated |
| **PII Exposure**   | High     | Automated PII redaction middleware, DLP scanning.      | Mitigated |
| **Prompt Leakage** | Medium   | Prompt hardening, input sanitization.                  | Mitigated |

### 5.5 Denial of Service (Availability)

| Threat                      | Severity | Mitigation                                      | Status    |
| :-------------------------- | :------- | :---------------------------------------------- | :-------- |
| **API Flooding**            | High     | Tiered rate limiting (Token bucket + Adaptive). | Mitigated |
| **LLM Resource Exhaustion** | Medium   | Token budgeting, pre-flight checks.             | Mitigated |
| **Graph Complexity Attack** | High     | Query depth/complexity limits, timeout guards.  | Mitigated |

### 5.6 Elevation of Privilege (Access)

| Threat              | Severity | Mitigation                                                       | Status    |
| :------------------ | :------- | :--------------------------------------------------------------- | :-------- |
| **Agent Jailbreak** | High     | "Constitutional AI" guardrails, separate execution environments. | Mitigated |
| **RBAC Bypass**     | Critical | OPA gatekeeper for all sensitive routes.                         | Mitigated |

## 6. Residual Risks & Acceptance

- **mTLS Gaps:** Service-to-service auth relies on network policies until full mTLS rollout (Sprint N+11). **Risk Accepted.**
- **LLM Determinism:** Agents may still hallucinate or be tricked by novel adversarial inputs. Mitigation relies on monitoring. **Risk Accepted.**

## 7. Change Management

Updates to this model are required when:

1.  New asset classes are introduced.
2.  Trust boundaries change (e.g., new external integration).
3.  New threat vectors are identified in the wild.

_Verified by Security Lead (Jules)_

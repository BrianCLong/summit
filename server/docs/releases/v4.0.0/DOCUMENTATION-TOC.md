# Summit v4.0.0 Documentation Table of Contents

This document outlines the complete documentation structure for Summit v4.0.0.

---

## 1. Getting Started

### 1.1 Introduction

- [Platform Overview](/docs/overview.md)
- [What's New in v4](/docs/releases/v4.0.0/RELEASE-NOTES.md)
- [Architecture Overview](/docs/architecture/overview.md)
- [Quick Start Guide](/docs/getting-started/quickstart.md)

### 1.2 Installation & Setup

- [System Requirements](/docs/getting-started/requirements.md)
- [Installation Guide](/docs/getting-started/installation.md)
- [Configuration Reference](/docs/getting-started/configuration.md)
- [Environment Variables](/docs/getting-started/env-variables.md)

### 1.3 Migration

- [v3 to v4 Migration Guide](/docs/releases/v4.0.0/MIGRATION-GUIDE.md)
- [Breaking Changes](/docs/releases/v4.0.0/RELEASE-NOTES.md#breaking-changes)
- [Deprecation Timeline](/docs/releases/v4.0.0/RELEASE-NOTES.md#deprecations)

---

## 2. Core Concepts

### 2.1 Governance Engine

- [Governance Overview](/docs/governance/overview.md)
- [Policy Definition Language](/docs/governance/policy-language.md)
- [Verdict Evaluation](/docs/governance/verdicts.md)
- [DataEnvelope Format](/docs/governance/data-envelope.md)

### 2.2 Provenance & Audit

- [Provenance Tracking](/docs/provenance/overview.md)
- [Chain of Custody](/docs/provenance/chain-of-custody.md)
- [Audit Logging](/docs/audit/logging.md)

### 2.3 Multi-Tenancy

- [Tenant Management](/docs/tenancy/overview.md)
- [Tenant Isolation](/docs/tenancy/isolation.md)
- [Tenant Configuration](/docs/tenancy/configuration.md)

---

## 3. AI-Assisted Governance (v4.0) ✨ NEW

### 3.1 Overview

- [AI Governance Introduction](/docs/ai-governance/overview.md)
- [Architecture & Design](/docs/ai-governance/architecture.md)
- [Security & Privacy](/docs/ai-governance/security.md)

### 3.2 Policy Suggestion Engine

- [Policy Suggestions Overview](/docs/ai-governance/policy-suggestions/overview.md)
- [Suggestion Types](/docs/ai-governance/policy-suggestions/types.md)
  - Gap Detection
  - Conflict Resolution
  - Optimization Recommendations
- [Human-in-the-Loop Workflow](/docs/ai-governance/policy-suggestions/approval-workflow.md)
- [Quota Management](/docs/ai-governance/policy-suggestions/quotas.md)
- [API Reference](/docs/ai-governance/policy-suggestions/api.md)

### 3.3 Verdict Explanation Service

- [Verdict Explanations Overview](/docs/ai-governance/explanations/overview.md)
- [Audience Types](/docs/ai-governance/explanations/audiences.md)
  - End User Explanations
  - Developer Explanations
  - Compliance Officer Explanations
  - Executive Summaries
- [Localization & Tone](/docs/ai-governance/explanations/localization.md)
- [Caching Strategy](/docs/ai-governance/explanations/caching.md)
- [API Reference](/docs/ai-governance/explanations/api.md)

### 3.4 Behavioral Anomaly Detection

- [Anomaly Detection Overview](/docs/ai-governance/anomalies/overview.md)
- [Detection Categories](/docs/ai-governance/anomalies/categories.md)
  - Access Pattern Anomalies
  - Privilege Escalation
  - Credential Abuse
  - Data Exfiltration
  - Volume Spikes
  - Geographic Anomalies
  - Time-Based Anomalies
- [Baseline Learning](/docs/ai-governance/anomalies/baselines.md)
- [Alert Configuration](/docs/ai-governance/anomalies/alerts.md)
- [False Positive Management](/docs/ai-governance/anomalies/false-positives.md)
- [API Reference](/docs/ai-governance/anomalies/api.md)

### 3.5 LLM Integration

- [LLM Provider Configuration](/docs/ai-governance/llm/providers.md)
  - OpenAI Integration
  - Anthropic Integration
  - Ollama (Self-Hosted)
  - Mock Provider (Testing)
- [Rate Limiting & Quotas](/docs/ai-governance/llm/rate-limiting.md)
- [Safety & Content Filtering](/docs/ai-governance/llm/safety.md)

---

## 4. Cross-Domain Compliance (v4.1) ✨ NEW

### 4.1 Overview

- [Compliance Framework Overview](/docs/compliance/overview.md)
- [Multi-Framework Architecture](/docs/compliance/architecture.md)
- [Control Mapping](/docs/compliance/control-mapping.md)

### 4.2 HIPAA Compliance

- [HIPAA Module Overview](/docs/compliance/hipaa/overview.md)
- [Control Categories](/docs/compliance/hipaa/controls.md)
  - Administrative Safeguards (45 CFR § 164.308)
  - Technical Safeguards (45 CFR § 164.312)
  - Breach Notification (45 CFR § 164.400-414)
- [PHI Identifiers Reference](/docs/compliance/hipaa/phi-identifiers.md)
- [Assessment Workflow](/docs/compliance/hipaa/assessments.md)
- [Evidence Collection](/docs/compliance/hipaa/evidence.md)
- [Remediation Planning](/docs/compliance/hipaa/remediation.md)
- [API Reference](/docs/compliance/hipaa/api.md)

### 4.3 SOX Compliance

- [SOX Module Overview](/docs/compliance/sox/overview.md)
- [SOX Sections](/docs/compliance/sox/sections.md)
  - Section 302: Corporate Responsibility
  - Section 404: Internal Control Assessment
  - Section 409: Real-Time Disclosure
- [ITGC Domains](/docs/compliance/sox/itgc.md)
  - Logical Access Controls
  - Change Management
  - Computer Operations
  - Program Development
- [Material Weakness Detection](/docs/compliance/sox/material-weakness.md)
- [Assessment Workflow](/docs/compliance/sox/assessments.md)
- [Evidence Collection](/docs/compliance/sox/evidence.md)
- [API Reference](/docs/compliance/sox/api.md)

### 4.4 Cross-Framework Features

- [Unified Control Mapping](/docs/compliance/cross-framework/mapping.md)
- [Gap Analysis](/docs/compliance/cross-framework/gap-analysis.md)
- [Compliance Dashboard](/docs/compliance/cross-framework/dashboard.md)
- [Reporting & Export](/docs/compliance/cross-framework/reporting.md)

---

## 5. Zero-Trust Security (v4.2) ✨ NEW

### 5.1 Overview

- [Zero-Trust Architecture](/docs/zero-trust/overview.md)
- [Security Model](/docs/zero-trust/security-model.md)
- [Threat Model](/docs/zero-trust/threat-model.md)

### 5.2 HSM Abstraction Layer

- [HSM Overview](/docs/zero-trust/hsm/overview.md)
- [Supported Providers](/docs/zero-trust/hsm/providers.md)
  - AWS CloudHSM
  - Azure Dedicated HSM
  - Thales Luna HSM
  - Software HSM (Development)
- [Key Management](/docs/zero-trust/hsm/key-management.md)
  - Key Generation
  - Key Rotation
  - Key Attestation
- [Cryptographic Operations](/docs/zero-trust/hsm/operations.md)
  - Signing & Verification
  - Encryption & Decryption
- [FIPS 140-2 Compliance](/docs/zero-trust/hsm/fips.md)
- [API Reference](/docs/zero-trust/hsm/api.md)

### 5.3 Immutable Audit Ledger

- [Audit Ledger Overview](/docs/zero-trust/audit/overview.md)
- [Merkle Tree Implementation](/docs/zero-trust/audit/merkle-tree.md)
- [Blockchain Anchoring](/docs/zero-trust/audit/blockchain.md)
- [Integrity Verification](/docs/zero-trust/audit/verification.md)
- [Event Types](/docs/zero-trust/audit/event-types.md)
- [Compliance Export](/docs/zero-trust/audit/export.md)
- [API Reference](/docs/zero-trust/audit/api.md)

### 5.4 Trusted Execution

- [TEE Overview](/docs/zero-trust/tee/overview.md)
- [Attestation](/docs/zero-trust/tee/attestation.md)
- [Secure Enclaves](/docs/zero-trust/tee/enclaves.md)

---

## 6. API Reference

### 6.1 Authentication & Authorization

- [Authentication Overview](/docs/api/auth/overview.md)
- [OAuth 2.0 / OIDC](/docs/api/auth/oauth.md)
- [JWT Tokens](/docs/api/auth/jwt.md)
- [Permission Scopes](/docs/api/auth/scopes.md)
- [API Keys](/docs/api/auth/api-keys.md)

### 6.2 REST API v4

- [API Overview](/docs/api/v4/overview.md)
- [Request/Response Format](/docs/api/v4/format.md)
- [Error Handling](/docs/api/v4/errors.md)
- [Rate Limiting](/docs/api/v4/rate-limiting.md)
- [Pagination](/docs/api/v4/pagination.md)

#### Governance Endpoints

- [POST /api/v4/governance/evaluate](/docs/api/v4/governance/evaluate.md)
- [GET /api/v4/governance/policies](/docs/api/v4/governance/policies.md)

#### AI Governance Endpoints

- [POST /api/v4/ai/policy-suggestions](/docs/api/v4/ai/policy-suggestions.md)
- [GET /api/v4/ai/policy-suggestions](/docs/api/v4/ai/policy-suggestions-list.md)
- [POST /api/v4/ai/verdict-explanations](/docs/api/v4/ai/verdict-explanations.md)
- [POST /api/v4/ai/anomalies/detect](/docs/api/v4/ai/anomalies-detect.md)
- [GET /api/v4/ai/anomalies](/docs/api/v4/ai/anomalies-list.md)

#### Compliance Endpoints

- [GET /api/v4/compliance/frameworks](/docs/api/v4/compliance/frameworks.md)
- [POST /api/v4/compliance/hipaa/assess](/docs/api/v4/compliance/hipaa-assess.md)
- [POST /api/v4/compliance/sox/assess](/docs/api/v4/compliance/sox-assess.md)
- [GET /api/v4/compliance/mappings](/docs/api/v4/compliance/mappings.md)

#### Zero-Trust Endpoints

- [POST /api/v4/zero-trust/hsm/keys](/docs/api/v4/zero-trust/hsm-keys.md)
- [POST /api/v4/zero-trust/hsm/keys/:id/sign](/docs/api/v4/zero-trust/hsm-sign.md)
- [POST /api/v4/zero-trust/audit/events](/docs/api/v4/zero-trust/audit-events.md)
- [GET /api/v4/zero-trust/audit/events/:id/verify](/docs/api/v4/zero-trust/audit-verify.md)

### 6.3 SDKs

- [JavaScript/TypeScript SDK](/docs/sdks/javascript.md)
- [Python SDK](/docs/sdks/python.md)
- [Go SDK](/docs/sdks/go.md)
- [SDK Migration Guide](/docs/sdks/migration.md)

---

## 7. Operations & Administration

### 7.1 Deployment

- [Deployment Overview](/docs/operations/deployment/overview.md)
- [Docker Deployment](/docs/operations/deployment/docker.md)
- [Kubernetes Deployment](/docs/operations/deployment/kubernetes.md)
- [High Availability](/docs/operations/deployment/ha.md)
- [Disaster Recovery](/docs/operations/deployment/dr.md)

### 7.2 Monitoring & Observability

- [Metrics Reference](/docs/operations/monitoring/metrics.md)
- [Logging](/docs/operations/monitoring/logging.md)
- [Tracing](/docs/operations/monitoring/tracing.md)
- [Health Checks](/docs/operations/monitoring/health.md)
- [Alerting](/docs/operations/monitoring/alerting.md)

### 7.3 Performance

- [Performance Tuning](/docs/operations/performance/tuning.md)
- [Caching](/docs/operations/performance/caching.md)
- [Connection Pooling](/docs/operations/performance/pooling.md)
- [Scaling Guidelines](/docs/operations/performance/scaling.md)

### 7.4 Security Operations

- [Security Hardening](/docs/operations/security/hardening.md)
- [Secret Management](/docs/operations/security/secrets.md)
- [Network Security](/docs/operations/security/network.md)
- [Incident Response](/docs/operations/security/incident-response.md)

---

## 8. Compliance & Certification

### 8.1 SOC 2 Compliance

- [SOC 2 Overview](/docs/compliance-certification/soc2/overview.md)
- [Control Matrix](/docs/compliance-certification/soc2/control-matrix.md)
- [Evidence Collection](/docs/compliance-certification/soc2/evidence.md)

### 8.2 Platform Certifications

- [FIPS 140-2 Compliance](/docs/compliance-certification/fips.md)
- [FedRAMP Readiness](/docs/compliance-certification/fedramp.md)
- [ISO 27001](/docs/compliance-certification/iso27001.md)

---

## 9. Tutorials & Guides

### 9.1 Quick Start Tutorials

- [Your First Policy](/docs/tutorials/first-policy.md)
- [Setting Up AI Governance](/docs/tutorials/ai-governance-setup.md)
- [Running a HIPAA Assessment](/docs/tutorials/hipaa-assessment.md)
- [Configuring HSM Keys](/docs/tutorials/hsm-setup.md)

### 9.2 Integration Guides

- [Integrating with IdP](/docs/guides/idp-integration.md)
- [SIEM Integration](/docs/guides/siem-integration.md)
- [CI/CD Pipeline Integration](/docs/guides/cicd-integration.md)
- [Custom LLM Provider](/docs/guides/custom-llm.md)

### 9.3 Best Practices

- [Policy Design](/docs/best-practices/policy-design.md)
- [Compliance Strategy](/docs/best-practices/compliance.md)
- [Security Architecture](/docs/best-practices/security.md)
- [Performance Optimization](/docs/best-practices/performance.md)

---

## 10. Reference

### 10.1 Configuration Reference

- [Server Configuration](/docs/reference/config/server.md)
- [Database Configuration](/docs/reference/config/database.md)
- [HSM Configuration](/docs/reference/config/hsm.md)
- [LLM Configuration](/docs/reference/config/llm.md)

### 10.2 Error Reference

- [Error Codes](/docs/reference/errors/codes.md)
- [Troubleshooting Guide](/docs/reference/errors/troubleshooting.md)

### 10.3 Glossary

- [Terms & Definitions](/docs/reference/glossary.md)

---

## 11. Release Information

### 11.1 Current Release

- [v4.0.0 Release Notes](/docs/releases/v4.0.0/RELEASE-NOTES.md)
- [v4.0.0 Migration Guide](/docs/releases/v4.0.0/MIGRATION-GUIDE.md)

### 11.2 Previous Releases

- [v3.x Release Notes](/docs/releases/v3/RELEASE-NOTES.md)
- [v2.x Release Notes](/docs/releases/v2/RELEASE-NOTES.md)

### 11.3 Roadmap

- [Product Roadmap](/docs/roadmap.md)
- [Deprecation Schedule](/docs/deprecations.md)

---

## Document Status

| Section                 | Status         | Last Updated |
| ----------------------- | -------------- | ------------ |
| Getting Started         | ✅ Complete    | January 2025 |
| Core Concepts           | ✅ Complete    | January 2025 |
| AI-Assisted Governance  | 🚧 In Progress | January 2025 |
| Cross-Domain Compliance | 🚧 In Progress | January 2025 |
| Zero-Trust Security     | 🚧 In Progress | January 2025 |
| API Reference           | ✅ Complete    | January 2025 |
| Operations              | ✅ Complete    | January 2025 |
| Tutorials               | 🚧 In Progress | January 2025 |
| Reference               | ✅ Complete    | January 2025 |

---

_Summit Platform v4.0.0 Documentation_
_Last Updated: January 2025_

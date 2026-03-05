# Summit Underwriting Intelligence (SUI) Security & Threat Model

## 1. Overview
The Summit Underwriting Intelligence (SUI) system handles sensitive data related to insurer portfolio risk, leaked credentials, and vulnerability data. This document outlines the threat model, security controls, and operational gates required for General Availability (GA).

## 2. Threat Model

### Key Risks
- **Sensitive Leaked Information:** Mishandling of PII, credentials, or breach data.
- **Customer Misuse:** Surveillance or targeting using platform intelligence.
- **Model Manipulation:** Adversaries seeding false leaks or poisoning signals to alter scores.
- **Tenant Data Bleed:** Failure of multi-tenant isolation, leading to cross-portfolio exposure.
- **Regulatory Exposure:** Non-compliance with purpose limitation, data retention, or explainability standards.

## 3. Security Controls

### 3.1 Tenant Isolation
- **Residency-aware Storage:** Data partitioned by tenant and region.
- **Cryptographic Envelopes:** Per-tenant encryption keys.
- **Access Control:** Strict purpose-based access control for leak artifacts (viewing raw vs. derived features).

### 3.2 PII Minimization
- **Encryption:** Raw artifacts are stored encrypted.
- **Exposure Limits:** Only hashed or derived features are exposed by default, minimizing the risk of PII leakage in reports or UI.

### 3.3 Audit & Logging
- **Tamper-evident Logs:** Append-only audit logs for all underwriting decisions.
- **Evidence Framework:** Every decision is backed by deterministically generated artifacts (`report.json`, `metrics.json`, `stamp.json`).

### 3.4 Anti-Poisoning Defenses
- **Source Reputation:** Heuristics to weigh the reliability of OSINT sources.
- **Cross-Source Corroboration:** Requiring multiple signals before impacting a risk score significantly.
- **Deterministic Pipelines:** Canonicalization, stable sorting, and pinned dependencies prevent hidden manipulation.

### 3.5 Abuse Prevention
- **Rate Limiting & Cost Caps:** Hard caps per tenant on entities monitored, ingestion bandwidth, and daily drift alerts.
- **Purpose Limitation Policies:** Strict enforcement of acceptable use cases.

## 4. GA Readiness Gates (Must Pass)
1. **Determinism Gate:** UDR-AC benchmark must be ≥ 0.99 on reference suites.
2. **Security Gate:** Comprehensive tenant isolation tests passing, PII minimization verified, and audit log integrity confirmed.
3. **Model Governance Gate:** Model cards created, drift monitoring active, and rollback capabilities tested.
4. **Operational Gate:** SLOs met under load; bounded ingestion costs verified.
5. **Evidence Gate:** `report.json`, `metrics.json`, and `stamp.json` validate successfully in CI for every release.

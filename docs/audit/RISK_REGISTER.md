# Residual Risk Register & Limitations
> **Transparency is Trust**. This document lists known limitations and accepted risks.

## 1. Scope Limitations

| Area | Limitation | Mitigation / Compensating Control |
|------|------------|-----------------------------------|
| **Legacy Archives** | Not indexed or audited. | Read-only access restricted to Admin. WORM storage. |
| **Dev Environment** | PII Detection disabled. | Synthetic data only. No production data allowed. |
| **Third-Party AI** | Prompt leakage risk. | `PII Sanitization Middleware` strips sensitive data before egress. |

## 2. Known Residual Risks

### RISK-01: Admin Override
* **Description**: Root admins can theoretically bypass OPA policies via direct DB access.
* **Likelihood**: Low
* **Impact**: High
* **Control**: "Break-Glass" alerts sent to Security Channel on any direct DB shell access.
* **Status**: Accepted (Standard operational risk).

### RISK-02: Metadata Leakage in Vector Store
* **Description**: Embeddings may implicitly encode sensitive relationships.
* **Likelihood**: Medium
* **Impact**: Medium
* **Control**: Tenant isolation enforced at query time (`CopilotNLQueryService`).
* **Status**: Monitoring (Active research area).

### RISK-03: Clock Skew in Distributed Audit
* **Description**: Logs from different nodes may have millisecond skew.
* **Likelihood**: High
* **Impact**: Low
* **Control**: NTP sync monitored. Logical clocks (Vector/Lamport) used for ordering critical events.
* **Status**: Mitigated.

## 3. Non-Goals (This Audit)

* **Physical Security**: We use Cloud Providers (AWS/GCP). Their SOC 2 applies.
* **Penetration Testing**: Scheduled for Q1 2026. Not part of this readiness Sprint.
* **Client-Side Security**: Browser extensions and endpoint security are out of scope.

---

## 4. Planned Remediations

* **Q1 2026**: Implement Hardware Security Module (HSM) for root key storage.
* **Q1 2026**: Automated "Chaos Monkey" for compliance controls (Compliance Chaos).

# Security Control Library

**Version:** 1.0
**Date:** 2025-12-27
**Owner:** Security Architecture
**Scope:** Cross-cutting controls aligned to SOC 2, ISO 27001, NIST 800-53, HIPAA, and GDPR

## Purpose

This library standardizes the baseline controls required for Summit services and integrations. Each control includes mappings to major frameworks so that evidence collection and CI enforcement remain consistent across subsystems.

## Control Catalog

### Identity & Access Management

| Control ID | Description                                                                                | SOC 2        | ISO 27001      | NIST 800-53  | HIPAA         | GDPR          |
| ---------- | ------------------------------------------------------------------------------------------ | ------------ | -------------- | ------------ | ------------- | ------------- |
| IAM-01     | Enforce SSO with MFA for workforce access; short-lived tokens (<15m) with refresh rotation | CC6.1, CC6.8 | A.5.17, A.5.15 | AC-2, IA-2   | 164.312(d)    | Art. 32(1)(b) |
| IAM-02     | Least-privilege RBAC for services, agents, and connectors; deny-by-default policies        | CC6.2        | A.5.18         | AC-6, AC-3   | 164.308(a)(4) | Art. 25       |
| IAM-03     | Just-in-time access with approval + expiry for admin paths; auditable elevation            | CC6.3        | A.5.18         | AC-17, AC-19 | 164.312(a)    | Art. 32(1)(d) |

### Data Protection & Privacy

| Control ID | Description                                                                          | SOC 2        | ISO 27001      | NIST 800-53  | HIPAA      | GDPR          |
| ---------- | ------------------------------------------------------------------------------------ | ------------ | -------------- | ------------ | ---------- | ------------- |
| DP-01      | Encrypt data in transit (TLS 1.2+) and at rest (AES-256); rotate keys annually       | CC6.7, CC6.8 | A.8.24         | SC-13, SC-28 | 164.312(e) | Art. 32(1)(a) |
| DP-02      | Field-level classification with PII/PHI tagging; enforce masking/redaction on egress | CC8.1        | A.5.12, A.5.34 | PT-2, SI-4   | 164.514(b) | Art. 25, 32   |
| DP-03      | Data retention + deletion SLAs with verifiable evidence; right-to-erasure workflow   | CC1.1, CC8.1 | A.5.12         | SI-12        | 164.310(d) | Art. 17       |

### Logging, Detection & Response

| Control ID | Description                                                                            | SOC 2        | ISO 27001 | NIST 800-53 | HIPAA         | GDPR    |
| ---------- | -------------------------------------------------------------------------------------- | ------------ | --------- | ----------- | ------------- | ------- |
| LDR-01     | Structured audit logging with correlation IDs across API, agents, and connectors       | CC7.2, CC7.3 | A.8.15    | AU-6, AU-12 | 164.312(b)    | Art. 30 |
| LDR-02     | Real-time alerting for auth failures, data egress anomalies, and policy bypass         | CC7.2        | A.8.16    | SI-4        | 164.308(a)(6) | Art. 33 |
| LDR-03     | Incident response runbooks with 24h containment SLA; tabletop exercises twice annually | CC7.4        | A.5.24    | IR-4, IR-8  | 164.308(a)(6) | Art. 33 |

### Vulnerability & Supply Chain Management

| Control ID | Description                                                                                    | SOC 2        | ISO 27001 | NIST 800-53 | HIPAA         | GDPR          |
| ---------- | ---------------------------------------------------------------------------------------------- | ------------ | --------- | ----------- | ------------- | ------------- |
| VULN-01    | Continuous SCA (Snyk/Trivy), CodeQL/Semgrep SAST, IaC (Checkov), container scans in CI         | CC7.1        | A.8.8     | RA-5, SI-2  | 164.308(a)(8) | Art. 32(1)(d) |
| VULN-02    | Enforce SBOM creation and attestation for releases; block promotion on critical CVEs           | CC7.1, CC7.2 | A.8.7     | CM-8, SI-7  | 164.308(a)(1) | Art. 30       |
| VULN-03    | Dependency provenance: pin registries, verify signatures/attestations, and lockfiles mandatory | CC6.3        | A.8.7     | SI-7(15)    | 164.308(a)(5) | Art. 32       |

### Third-Party & Integration Security

| Control ID | Description                                                                                   | SOC 2        | ISO 27001 | NIST 800-53 | HIPAA         | GDPR    |
| ---------- | --------------------------------------------------------------------------------------------- | ------------ | --------- | ----------- | ------------- | ------- |
| TP-01      | Vendor due diligence with data flow mapping, DPIA where required, and contractual DPAs        | CC1.2, CC3.2 | A.5.20    | SA-9        | 164.308(b)(3) | Art. 28 |
| TP-02      | Webhook and OAuth hardening: signatures, nonce/replay defense, PKCE/state, scoped tokens      | CC7.2        | A.8.16    | IA-2, SI-10 | 164.312(a)    | Art. 25 |
| TP-03      | Continuous vendor monitoring: rate limits, anomaly detection, automated disable on SLA breach | CC7.1        | A.5.30    | SI-4, SC-5  | 164.308(a)(1) | Art. 32 |

## Implementation Notes

- **Policy-as-code:** Express enforcement with OPA/Conftest for Kubernetes/Helm and Semgrep/CodeQL for application rules.
- **CI gates:** Integrate `ci-security.yml` outputs into release promotions; block on HIGH/CRITICAL vulnerabilities or missing evidence.
- **Evidence management:** Capture logs, screenshots, and pipeline artifacts in `COMPLIANCE_EVIDENCE_INDEX.md` for auditor traceability.
- **Data minimization:** Default connectors to read-only and redact PII/PHI fields unless explicitly required.
- **Risk exceptions:** Time-bound approvals recorded in `risk-change-log.md` with compensating controls and expiry.

## Review Cadence

- **Monthly:** Vulnerability management (VULN controls) and IaC policy drift checks.
- **Quarterly:** IAM, logging/detection coverage, and third-party integration controls.
- **Annually:** DPIA refresh for GDPR, HIPAA Security Rule safeguard validation, and SOC 2 readiness reviews.

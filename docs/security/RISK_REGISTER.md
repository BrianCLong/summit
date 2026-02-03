# Security Risk Register

> **Status:** Active
> **Custodian:** Security Team
> **Last Updated:** 2025-10-27

This register tracks the top security risks facing the IntelGraph platform, assigned owners, and target ship dates for mitigation. This is a living document used to prioritize security engineering work.

## Top 10 Security Risks

| Rank | Risk ID | Risk Title | Severity | Owner | Mitigation Plan | Ship Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **R-AUTH-01** | **Fragmented Identity & Standing Access** | Critical | CISO | Enforce SSO + MFA everywhere. Implement JIT access for production. | 2025-Q4 | In Progress |
| 2 | **R-ASSET-01** | **Unknown Attack Surface** | Critical | Infra Lead | Implement continuous asset discovery and "Kill Zombie" program. | 2025-Q4 | Planned |
| 3 | **R-DATA-01** | **Sensitive Data Sprawl** | High | Data Eng | Classify all data stores. Implement redaction by default in logs. | 2026-Q1 | Planned |
| 4 | **R-VULN-01** | **Patching Delays** | High | DevOps | Automate patching with SLAs (7 days for Crit). | 2026-Q1 | Planned |
| 5 | **R-SUPPLY-01** | **Unverified Software Supply Chain** | High | AppSec | Implement SBOM generation and signed builds. Pin dependencies. | 2026-Q2 | Planned |
| 6 | **R-APP-01** | **Inconsistent Security Controls** | Medium | AppSec | Standardize secure coding libraries (Auth, Crypto, Input). | 2026-Q2 | Planned |
| 7 | **R-INSIDER-01** | **Insider Threat Blindness** | Medium | SecOps | Centralize audit logs. Implement anomaly detection for privilege use. | 2026-Q3 | Planned |
| 8 | **R-VENDOR-01** | **Third-Party Risk** | Medium | GRC | Inventory vendors. Enforce minimum security requirements. | 2026-Q3 | Planned |
| 9 | **R-RESIL-01** | **Disaster Recovery Maturity** | Medium | Infra Lead | Formalize DR runbooks and run quarterly drills. | 2026-Q4 | Planned |
| 10 | **R-CULT-01** | **Security Awareness Gaps** | Low | GRC | Launch quarterly security training and game days. | 2026-Q4 | Planned |
| 11 | **R-SUPPLY-02** | **n8n RCE (Ni8mare)** | Critical | AppSec | CI Gate (`verify_n8n_safe.sh`) + WAF Rules. | 2026-Q1 | Mitigated |
| 12 | **R-BRAND-01** | **AI-DaaS Saturation** | High | Intel | Synthetic Amplification Detector (DET-SYN-001). | 2026-Q1 | Monitoring |

## Mitigation Definitions

*   **Critical:** Immediate threat to Tier 0 assets. Must be fixed now.
*   **High:** Significant threat to Tier 1 assets. Fix within quarter.
*   **Medium:** Threat to Tier 2 assets or long-term risk. Fix within 2 quarters.
*   **Low:** Best practice gap. Fix when resources allow.

## Risk Acceptance

Risks that cannot be mitigated by the target date must be formally accepted via the [Exceptions Registry](./EXCEPTIONS_REGISTRY.md).

## Change Log

| Date | Risk ID | Action | New Status |
| :--- | :--- | :--- | :--- |
| 2025-10-27 | All | Register Created | Active |

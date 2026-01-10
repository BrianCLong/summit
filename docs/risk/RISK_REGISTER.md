# Consolidated Risk Register

> **Status:** Active
> **Custodian:** Jules (Trust Debt Manager)
> **Last Updated:** 2025-12-31

This register is the **single source of truth** for long-horizon risks, deferred items, and policy exceptions. All risks must have an owner and a sunset condition. Open-ended risks are not permitted.

## Active Risks

| Risk ID | Description | Category | Status | Evidence | Owner | Sunset Condition | Latest Date | Escalation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-SEC-001** | **Fragmented Identity & Standing Access.** Lack of universal SSO/MFA and JIT access allows potential unauthorized access. | Security | Active | `docs/security/RISK_REGISTER.md` | CISO | Universal SSO + MFA enforced; JIT for Prod. | 2025-12-31 | **Block GA** |
| **R-SEC-002** | **Critical Vulnerability Backlog.** 18 Critical issues identified in Security Audit (JWT bypass, Injection, Hardcoded secrets). | Security | Active | `docs/security/SECURITY-ISSUE-LEDGER.md` | Head of Eng | 0 Critical issues remaining in Ledger. | 2026-01-07 | **Code Freeze** |
| **R-SEC-003** | **Unknown Attack Surface.** Incomplete asset inventory allows "zombie" infrastructure to persist. | Security | Active | `docs/security/RISK_REGISTER.md` | Infra Lead | 100% Asset Discovery coverage verified. | 2026-03-31 | Audit Failure |
| **R-DATA-01** | **Sensitive Data Sprawl.** Unclassified data stores and lack of default redaction. | Governance | Active | `docs/security/RISK_REGISTER.md` | Data Eng | All stores classified; Redaction by default. | 2026-03-31 | API Shutdown |
| **R-SUPPLY-01** | **Unverified Software Supply Chain.** Lack of strict SBOM generation and signing for all artifacts. | Security | Active | `docs/security/RISK_REGISTER.md` | AppSec | Full SBOM + Signed Builds for all releases. | 2026-06-30 | Block Release |
| **R-OPS-01** | **Disaster Recovery Maturity.** DR runbooks are informal; drills are irregular. | Reliability | Active | `docs/security/RISK_REGISTER.md` | Infra Lead | Formal Runbooks + Qtrly Drills (Pass). | 2026-12-31 | Ops Freeze |
| **R-AUTH-03** | **Client-Controlled Tenant ID.** Tenant ID accepted from headers/query without verification. | Security | Active | `docs/security/SECURITY-ISSUE-LEDGER.md` | Core Eng | Tenant ID derived strictly from JWT. | 2026-01-07 | **Block GA** |

## Deferred / Accepted Risks (With Sunsets)

| Risk ID | Description | Category | Status | Evidence | Owner | Sunset Condition | Latest Date | Escalation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-DEF-001** | **Legacy Admin Portal MFA Exemption.** (EX-2025-001) Portal lacks SAML support. | Security | **Accepted** | `docs/security/EXCEPTIONS_REGISTRY.md` | Infra Team | Legacy Portal Decommissioned. | 2025-12-31 | **Disable Access** |
| **R-DEF-002** | **Debug Log Redaction Waiver.** (EX-2025-002) Full query logging enabled for race condition debugging. | Ops | **Accepted** | `docs/security/EXCEPTIONS_REGISTRY.md` | Platform | Race condition fixed & Logs cleared. | 2025-11-15 | **Force Disable** |
| **R-DEF-003** | **Technical Debt Overload.** Massive accumulation of skipped tests and TODOs in debt registry. | Governance | **Accepted** | `debt/registry.json` | Eng Leads | Debt count < 50 items. | 2026-06-30 | Feature Freeze |

## Consolidated Sources

*   [Security Risk Register](../security/RISK_REGISTER.md)
*   [Security Issue Ledger](../security/SECURITY-ISSUE-LEDGER.md)
*   [Exceptions Registry](../security/EXCEPTIONS_REGISTRY.md)
*   [Debt Registry](../../debt/registry.json)

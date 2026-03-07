# Security Exceptions Registry

## Overview

This registry tracks all active security exceptions (waivers). **There are no permanent waivers.** Every exception must have an expiration date and an owner who is responsible for remediation.

## Active Exceptions

| ID              | Risk / Policy   | Asset / Scope            | Owner         | Justification                                                                 | Expiration | Status | Approver |
| :-------------- | :-------------- | :----------------------- | :------------ | :---------------------------------------------------------------------------- | :--------- | :----- | :------- |
| **EX-2025-001** | MFA Enforcement | Legacy Admin Portal      | Infra Team    | Legacy portal does not support SAML. Scheduled for decommissioning in Q4.     | 2025-12-31 | Active | CISO     |
| **EX-2025-002** | Data Redaction  | Debug Logs (Dev Cluster) | Platform Team | Full query logging needed to debug complex race condition. Data is synthetic. | 2025-11-15 | Active | SecEng   |

## Expired / Closed Exceptions

| ID              | Risk / Policy  | Asset / Scope  | Owner | Resolution           | Closed Date |
| :-------------- | :------------- | :------------- | :---- | :------------------- | :---------- |
| **EX-2025-000** | Example Waiver | Example System | Owner | Remedied by upgrade. | 2025-01-01  |

## Exception Process

1.  **Request:** Owner submits request with Justification, Mitigation (compensating controls), and Remediation Plan.
2.  **Review:** Security Engineering reviews risk and mitigations.
3.  **Approval:**
    - **Low/Medium Risk:** Approved by Security Engineering.
    - **High/Critical Risk:** Approved by CISO (and CEO if Tier 0).
4.  **Tracking:** Exception is logged here.
5.  **Expiration:** On expiration, the exception is revoked. The system must be compliant or turned off, unless a new exception is granted (requires VP-level approval).

## Escalation

If an exception expires and is not remediated, the Security Team has the authority to disable the non-compliant system to protect the wider platform.

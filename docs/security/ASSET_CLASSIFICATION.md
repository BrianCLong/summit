# Asset Classification Policy

## Overview

This policy defines the classification levels for all assets (systems, data, workflows) within the organization. Proper classification ensures that appropriate security controls are applied to protect our most critical assets while maintaining agility for less critical ones.

## Classification Tiers

### Tier 0: Critical Infrastructure (The "Crown Jewels")

**Definition:** Assets that, if compromised, would result in immediate and catastrophic impact to the business, including total loss of trust, massive financial loss, or existential legal liability.

- **Availability Target:** 99.99%
- **Security Controls:** Maximum (MFA+Hardware Key, 4-eyes principle, continuous audit, 1-hour P0 SLA).

**Examples:**

- Production Database (Customer Data)
- Identity Provider (IdP) / SSO Root
- Key Management Service (KMS) / Root CAs
- Production Kubernetes Cluster Admin Contexts
- Source Code Repositories (Main/Release branches)
- Deployment Pipelines (CD) to Production

### Tier 1: High Importance (Business Critical)

**Definition:** Assets that are essential for business operations but have a lower blast radius than Tier 0. Compromise would be painful and costly but recoverable.

- **Availability Target:** 99.9%
- **Security Controls:** High (MFA, daily audit, 24-hour P1 SLA).

**Examples:**

- Staging Environments
- Customer Support Portals
- Internal Business Intelligence / Analytics (Non-PII)
- Marketing Website (Public)
- Email / Slack / Collaboration Tools
- Non-Production Secrets

### Tier 2: Standard (Internal/Dev)

**Definition:** Assets used for internal operations or development that do not host sensitive data. Compromise is low impact and easily contained.

- **Availability Target:** 99.0%
- **Security Controls:** Standard (SSO, best effort audit, 7-day P3 SLA).

**Examples:**

- Development Environments (Ephemeral)
- Test Data (Synthetic)
- Employee Laptops (Standard Build)
- Wiki / Documentation (Internal)
- Jira / Ticketing Systems

## Data Classification

| Classification            | Description                                                                | Examples                                                                      | Handling Requirements                                        |
| :------------------------ | :------------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :----------------------------------------------------------- |
| **Restricted (Red)**      | Data requiring the highest level of protection. Breach causes severe harm. | Credentials, Private Keys, Customer PII (SSN, Financial), Health Data.        | Encrypted at rest/transit. Tier 0 Access only. Never logged. |
| **Confidential (Orange)** | Sensitive business data. Breach causes reputational/financial harm.        | Customer Lists, Contracts, Source Code, Internal Strategy, Employee Salaries. | Encrypted at rest/transit. Need-to-know access.              |
| **Internal (Green)**      | Data for internal use only. Breach causes minor embarrassment.             | Internal Wikis, Slack history, Org charts, Policies.                          | Access restricted to employees.                              |
| **Public (White)**        | Data intended for public consumption.                                      | Marketing site, Public Docs, Open Source Code.                                | No restrictions.                                             |

## Application of Controls

| Control            | Tier 0                                  | Tier 1                           | Tier 2                     |
| :----------------- | :-------------------------------------- | :------------------------------- | :------------------------- |
| **Access Control** | JIT + Approval + Hardware MFA           | SSO + MFA                        | SSO                        |
| **Network**        | Private Subnet + VPN/Bastion only       | Private Subnet                   | Internal Network           |
| **Logging**        | Full Capture + Alerting (1yr retention) | Standard Capture (90d retention) | Error Logs (30d retention) |
| **Change Mgmt**    | Peer Review + Auto-Test + Canary        | Peer Review + Auto-Test          | Peer Review                |
| **Vuln SLA**       | Crit: 24h, High: 7d                     | Crit: 7d, High: 30d              | Crit: 30d, High: 90d       |
| **DR/Backup**      | Hot Standby (RPO < 5m)                  | Daily Backup (RPO < 24h)         | Best Effort                |

## Asset Tagging

All resources (AWS, K8s, Code) must be tagged with:

- `classification`: `tier-0`, `tier-1`, `tier-2`
- `owner`: `<team-email>`
- `data-sensitivity`: `restricted`, `confidential`, `internal`, `public`

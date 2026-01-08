# Plans and Pricing Model

This document outlines the plans, tiers, limits, and billing mechanics for the platform. It serves as the source of truth for entitlement checks and billing logic.

## 1. Plan Tiers

The platform offers the following standard tiers. Custom enterprise plans are available for high-volume or compliance-heavy use cases.

### 1.1. Free / Developer Tier

- **Target Audience:** Individual developers, hobbyists, and evaluators.
- **Goal:** Enable frictionless trial and adoption of core features.
- **Restrictions:** Strictly limited quotas, community support only, no SLA.

### 1.2. Pro / Team Tier

- **Target Audience:** Small teams and startups.
- **Goal:** Production-ready capabilities for small-scale deployments.
- **Includes:** Increased quotas, priority email support, standard data retention.

### 1.3. Business / Scale Tier

- **Target Audience:** Growing companies and mid-market organizations.
- **Goal:** Scalability, advanced collaboration, and compliance features.
- **Includes:** High quotas, SSO/SAML, extended data retention, 99.9% uptime SLA.

### 1.4. Enterprise Tier

- **Target Audience:** Large organizations and regulated industries.
- **Goal:** Custom limits, dedicated support, and advanced security/governance.
- **Includes:** Custom quotas, dedicated account manager, 99.99% SLA, on-prem/VPC options, advanced audit logs.

## 2. Included Limits and Quotas

Quotas are enforced at the **Tenant** (Organization) level unless otherwise specified.

| Feature Category    | Metric              | Free    | Pro      | Business  | Enterprise             |
| :------------------ | :------------------ | :------ | :------- | :-------- | :--------------------- |
| **API Requests**    | Requests / Month    | Limited | Standard | High      | Custom                 |
| **Storage**         | GB / Month          | Limited | Standard | High      | Custom                 |
| **Users**           | Seats               | 1-5     | Up to 20 | Up to 100 | Unlimited              |
| **Projects**        | Active Projects     | 1       | 5        | Unlimited | Unlimited              |
| **Data Retention**  | Days                | 7       | 30       | 90        | Custom (up to 7 years) |
| **Concurrent Jobs** | Parallel Executions | 1       | 5        | 20        | Custom                 |

## 3. Overage Model

### 3.1. Concept

For select metrics (e.g., API requests, Storage), customers on paid tiers can exceed their included limits. This usage is billed as "overage" in arrears.

- **Soft Limits:** Usage creates an alert but does not block service (typical for Enterprise).
- **Hard Limits:** Usage is blocked immediately upon reaching the limit (typical for Free/Pro).

### 3.2. Metering

- **Granularity:** Usage is metered in real-time or near real-time.
- **Billing:** Overages are calculated at the end of the billing cycle.

## 4. Upgrade and Downgrade Rules

### 4.1. Upgrades

- **Timing:** Immediate.
- **Proration:** The difference in base price for the remainder of the billing cycle is charged immediately.
- **Quotas:** New limits apply immediately.

### 4.2. Downgrades

- **Timing:** Effective at the **end** of the current billing cycle.
- **Refunds:** No refunds for partial months on downgrades (service continues at higher tier until cycle end).
- **Data Impact:** If downgrading results in usage exceeding new limits (e.g., storage), the customer enters a grace period to reduce usage before data is archived or deleted.

### 4.3. Cancellations

- See [Cancellation & Retention Flow](./cancellation.md) for detailed workflows.

## 5. Billing Cycle

- **Standard:** Monthly or Annual.
- **Invoicing:** Generated on the renewal date.
- **Payment Terms:** Net-0 (Credit Card) for Free/Pro/Business; Net-30/Custom for Enterprise.

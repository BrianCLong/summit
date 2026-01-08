# System of Record (SoR) per Domain

To ensure data consistency and eliminate ambiguity, this document designates the canonical System of Record (SoR) for each primary data domain. The SoR is the single authoritative source for a given data element or dataset. All other systems and analytical tables must reconcile with the SoR.

Data from these systems will be ingested into the canonical data warehouse to create a comprehensive view, but the ultimate source of truth remains the designated SoR. In case of discrepancies, the data within the SoR is considered correct.

## 1. Billing & Financials

- **System of Record:** [e.g., Stripe, NetSuite, Zuora]
- **Description:** This system holds all data related to customer subscriptions, invoices, payments, and revenue recognition.
- **Key Data:** Monthly Recurring Revenue (MRR), customer subscription status, plan details, invoice history.
- **Data Owner:** Finance Department

## 2. Product Events & User Behavior

- **System of Record:** [e.g., Segment, Snowplow, in-house event tracking system]
- **Description:** This system captures all user interactions and events within the product.
- **Key Data:** User sign-ups, feature usage, clicks, page views, application performance metrics.
- **Data Owner:** Product Department

## 3. Customer Support & Success

- **System of Record:** [e.g., Zendesk, Salesforce Service Cloud, Intercom]
- **Description:** This system is the source of truth for all customer support tickets, interactions, and success metrics.
- **Key Data:** Support ticket volume, resolution times, customer satisfaction (CSAT) scores, agent performance.
- **Data Owner:** Customer Support Department

## 4. Identity & User Management

- **System of Record:** [e.g., Auth0, Okta, internal user service]
- **Description:** This system manages user identity, authentication, and core account information.
- **Key Data:** User ID, email addresses, authentication events, account creation date.
- **Data Owner:** Engineering Department

## 5. Sales & CRM

- **System of Record:** [e.g., Salesforce, HubSpot]
- **Description:** This system contains all information related to sales activities, leads, opportunities, and customer relationships.
- **Key Data:** Lead status, opportunity pipeline, account ownership, deal size.
- **Data Owner:** Sales Department

## Reconciliation

The data platform team will be responsible for building and maintaining automated reconciliation jobs to ensure that data in the warehouse accurately reflects the data in the respective Systems of Record. Any significant discrepancies will trigger an alert for investigation.

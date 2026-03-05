# WorkOS Integration & Subsumption Strategy

## Overview
WorkOS is an identity infrastructure platform ("Stripe for enterprise authentication") that provides out-of-the-box support for Enterprise SSO (SAML/OIDC), Directory Sync (SCIM), Audit Logs, and RBAC.

This document explores how WorkOS could be subsumed into Summit’s architecture to accelerate our enterprise readiness, replacing or augmenting our current bespoke identity and compliance layers.

## Current State vs. WorkOS Capabilities

| Capability | Current Summit Implementation | WorkOS Solution | Architectural Impact |
| :--- | :--- | :--- | :--- |
| **Enterprise SSO** | Custom OIDC integrations (Auth0, Azure, Google) mapped manually. | Unified Single API for all SAML/OIDC providers. | Replaces [SSO OIDC Runbook](../runbooks/sso-oidc.md) bespoke configurations. Reduces maintenance of per-provider logic. |
| **Directory Sync** | Planned/Bespoke SCIM implementations. | Automated SCIM syncing with Okta, Active Directory, Workday, etc. | Automates onboarding/offboarding. Feeds directly into our PostgreSQL user/org tables. |
| **Audit Logging** | Custom [Provenance Ledger](./prov-ledger.md) and Kafka event streams. | Built-in Audit Logs with SIEM streaming (Splunk, Datadog). | Augments our Provenance Ledger. WorkOS handles the *identity* audit events, while Summit handles the *intelligence/graph* provenance. |
| **RBAC / Authorization** | Open Policy Agent (OPA) + Custom DB roles. | WorkOS FGA (Fine-Grained Authorization) or User Management. | We likely retain OPA for strict Zero-Trust/Data Sovereignty rules, but use WorkOS to manage the base roles and org structures. |

## Subsumption Strategy (How it fits)

If we were to integrate WorkOS, it would sit at the **Internet Edge** (replacing Auth0) and integrate directly with our API Gateway and Control Plane.

### Modified Day-1 Topology

1.  **Internet Edge:**
    *   **External Tenants** -> **WorkOS** -> **API Gateway (Envoy+WAF)**
    *   WorkOS handles the heavy lifting of enterprise federation (SAML/SCIM).
    *   Our Gateway validates the WorkOS JWTs before passing traffic to the mesh.

2.  **Control Plane (Identity & Policy):**
    *   **WorkOS Webhooks** fire on user/group creation (SCIM events).
    *   A new **WorkOS Sync Worker** consumes these webhooks and updates our `Postgres` tenant databases and `Neo4j` graph (representing organizational hierarchies).
    *   **OPA** consumes the normalized user attributes (roles, groups) from our local DB to enforce Zero-Trust Data Sovereignty.

3.  **Audit Trail Integration:**
    *   Identity events (logins, MFA changes) are pushed to **WorkOS Audit Logs**.
    *   Our **Provenance Ledger** subscribes to the WorkOS Audit Log stream (via webhook or SIEM connector) to maintain a complete, immutable chain of custody for investigations.

## Why this aligns with the "Proof Moat"

Summit competes on **provability and accountability**, not on building commodity SAML wrappers.
By subsuming WorkOS, we offload the undifferentiated heavy lifting of enterprise identity plumbing. This allows our engineering cycles to focus entirely on the **Provenance Ledger, Deterministic Execution, and OPA Policy enforcement**—the actual components of our Proof Moat.

# Ownership Model & Decision Rights

**Status**: Active
**Last Updated**: 2025-12-03
**Owner**: Organizational Scaling Lead

This document canonicalizes the ownership model for the Summit platform. It defines clear DRIs (Directly Responsible Individuals/Teams) for every critical surface, ensuring accountability and scalability.

## 1. Ownership Domains & DRIs

Every domain must have a single DRI. Shared ownership is not permitted.

| Domain                      | Scope Description                                            | DRI (GitHub Team)               |
| :-------------------------- | :----------------------------------------------------------- | :------------------------------ |
| **Capabilities & Agents**   | Core platform features, agent behaviors, AI services.        | `@intelgraph/platform-core`     |
| **Policies & Entitlements** | OPA policies, ABAC rules, licensing, feature flags.          | `@intelgraph/policy-team`       |
| **Budgets & Cost Domains**  | Resource quotas, cloud spend, financial limits.              | `@intelgraph/finops-team`       |
| **Invariants & Proofs**     | Security invariants, cryptographic proofs, ledger integrity. | `@intelgraph/security-team`     |
| **Integrations & Plug-ins** | External connectors, third-party plugins, API contracts.     | `@intelgraph/integrations-team` |
| **Data & Graph Schema**     | Data models, ontology, migration logic.                      | `@intelgraph/data-team`         |
| **Observability & SLOs**    | Metrics, logs, tracing, alerting rules.                      | `@intelgraph/ops-team`          |
| **Frontend & UX**           | Web application, design system, client-side logic.           | `@intelgraph/frontend-team`     |
| **Provenance & Audit**      | Audit logs, provenance ledger, compliance artifacts.         | `@intelgraph/provenance-team`   |

## 2. Decision Routing

Decisions are classified by type and routed to specific approvers.

| Decision Class               | Description                                               | Required Approvers                                | Escalation Path     | Response SLA |
| :--------------------------- | :-------------------------------------------------------- | :------------------------------------------------ | :------------------ | :----------- |
| **Safety/Invariant Changes** | Modifications to security guarantees, proofs, or ledgers. | `@intelgraph/security-team` + `Security Lead`     | CISO                | 4 hours      |
| **Entitlement/SKU Changes**  | Changes to pricing, plans, or access control policies.    | `@intelgraph/policy-team` + `Product Lead`        | VP Product          | 24 hours     |
| **Cost Baseline Changes**    | Increases in budget caps or resource request limits.      | `@intelgraph/finops-team`                         | VP Engineering      | 24 hours     |
| **Partner Certification**    | Approval of new external integrations or partners.        | `@intelgraph/integrations-team` + `Security Lead` | VP Business Dev     | 48 hours     |
| **Standard Feature**         | Routine code changes within a domain.                     | Domain DRI                                        | Engineering Manager | 24 hours     |

## 3. Escalation Policy

If a decision is stalled or contested:

1. **Level 1 (DRI)**: The Domain DRI has final say on technical implementation details.
2. **Level 2 (Lead)**: If impact crosses domains, Team Leads must align.
3. **Level 3 (Executive)**: Unresolved conflicts escalate to the VP/C level defined in the Escalation Path.

## 4. Ownership Drift & Audits

- **Drift Detection**: CI runs daily to identify files without an owner or domains without a DRI.
- **Audit Schedule**: Ownership audits occur quarterly.
- **Rule**: If an owner leaves, a new DRI must be assigned within 3 business days.

## 5. Agent & Partner Boundaries

- **Agents**: Agents may _propose_ changes but cannot _approve_ them.
- **Partners**: Partner submissions require explicit sign-off from the domain owner.
- **Enforcement**: CI checks verify that no merge occurs solely on agent/partner authority.

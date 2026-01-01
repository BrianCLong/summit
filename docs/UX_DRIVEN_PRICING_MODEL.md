# UX-Driven Pricing & Packaging Model for Summit

This document outlines a pricing and packaging model for the Summit platform. The tiers are structured based on the value derived from specific UX capabilities, aligning price with the customer's need for trust, control, and strategic insight.

## Core Principle
Users pay for confidence and control. As the stakes get higher, the UX provides more explicit guarantees, and the value increases accordingly.

---

## Tier 1: Developer / Free
*   **Target Audience:** Individual developers, students, or analysts exploring the platform's core capabilities on non-critical projects.
*   **Price:** Free
*   **Core UX Value:** Core Analytics & Exploration.
*   **Included UX-Related Features:**
    *   **Core Analytics:** Full access to the graph visualization and query interface (`client/`).
    *   **Basic Orchestration:** Ability to run analysis pipelines via the `.maestro/` engine.
    *   **Standard UI:** Access to the standard `client/` UI with its full component set.
    *   **Community Support:** Access to public documentation and community forums.
*   **UX Limitations (Incentives to Upgrade):**
    *   No advanced audit trails.
    *   No role-based access control (RBAC) reflected in the UI.
    *   No guarantees around data residency or compliance.
    *   No access to the `conductor-ui/` for advanced ops.
    *   Limited history/undo capabilities.

---

## Tier 2: Professional / Team
*   **Target Audience:** Small teams or departments using Summit for collaborative, business-critical analysis.
*   **Price:** [Example: $XX/user/month]
*   **Core UX Value:** Collaboration, Trust, and Repeatability.
*   **Includes everything in Developer, plus:**
    *   **Enhanced Collaboration:** Real-time multi-user sessions on graphs.
    *   **Human Failure Resistance (Standard):**
        *   Multi-step confirmations for destructive actions (e.g., deleting graphs).
        *   Detailed activity history for all users.
    *   **System Coherence:** Access to the `conductor-ui/` for managing orchestration jobs and pipelines.
    *   **Continuous Learning (Basic):** Access to team-level dashboards on feature usage and workflow patterns.
    *   **Standard Support:** Email and ticket-based support.

*   **UX Limitations (Incentives to Upgrade):**
    *   No guaranteed compliance with specific standards (e.g., SOC2, HIPAA).
    *   No fine-grained RBAC (e.g., node-level permissions).
    *   No UX-based power boundaries or advanced control design.
    *   No access to strategic UX intelligence.

---

## Tier 3: Enterprise
*   **Target Audience:** Large organizations using Summit for mission-critical operations where auditability, security, and governance are non-negotiable.
*   **Price:** [Example: Custom Annual Contract]
*   **Core UX Value:** Strategic Governance, Absolute Trust, and Competitive Advantage.
*   **Includes everything in Professional, plus:**
    *   **UX as Strategy Features:**
        *   **Full Auditability:** Immutable, exportable audit logs for every action taken by any user. The UI provides direct, searchable access to these logs.
        *   **Advanced Control Design:** Fine-grained, UI-enforced RBAC (e.g., who can see/edit certain nodes, who can run high-impact pipelines).
        *   **Power Boundary Enforcement:** UX "ceremonies" for critical actions, requiring multi-user approval or executive sign-off directly within the UI.
    *   **CI Enforcement & Governance:**
        *   Guaranteed adherence to the full `ux_governance.yml` spec, including performance budgets and accessibility standards.
        *   Access to the "UX Knowledge Base" and "Retired Pattern Registry".
    *   **Continuous Evolution & Intelligence:**
        *   Access to advanced UX intelligence dashboards, including anomaly detection and workaround tracking.
        *   Ability to define custom UX evolution triggers for the organization's specific needs.
    *   **Premium Support:** Dedicated account manager, guaranteed SLAs, and direct access to UX strategists for roadmap consultation.

---

## Summary Table

| Feature Category              | Developer (Free) | Professional (Team) | Enterprise (Custom) |
| ----------------------------- | :--------------: | :-----------------: | :-----------------: |
| **Core Analytics UI**         |        ✅        |         ✅          |         ✅          |
| **Collaboration Tools**       |        ❌        |         ✅          |         ✅          |
| **Basic Action Confirmations**|        ❌        |         ✅          |         ✅          |
| **Ops UI (`conductor-ui`)**   |        ❌        |         ✅          |         ✅          |
| **Full Audit Trails (UI)**    |        ❌        |         ❌          |         ✅          |
| **Fine-Grained RBAC (UI)**    |        ❌        |         ❌          |         ✅          |
| **Power Boundaries/Ceremonies**|        ❌        |         ❌          |         ✅          |
| **UX Governance Guarantees**  |        ❌        |         ❌          |         ✅          |
| **Advanced UX Intelligence**  |        ❌        |         ❌          |         ✅          |
| **Premium Support & Roadmap** |        ❌        |         ❌          |         ✅          |

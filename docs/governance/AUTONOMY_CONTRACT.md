# Summit Autonomy Contract

**Effective Date:** 2025-10-27
**Status:** Active

## Purpose
This contract defines the relationship between Summit platform leadership and independent value-stream pods. It grants pods high autonomy to ship features in exchange for adherence to strict quality, reliability, and cost guardrails.

## The Deal
**You (The Pod) get:**
*   **Independence:** No central architecture review board for standard changes.
*   **Velocity:** Ability to deploy to production at will (daily/weekly) via paved roads.
*   **Ownership:** Full control over your service's internal design and roadmap.

**In exchange, You (The Pod) promise:**
1.  **Paved Road Adherence:** Use the standard stack (Node/TS/Apollo, Neo4j, Postgres, Redis, OTel) by default.
2.  **Guardrail Compliance:** Meet all CI gates (Tests, Policy, Security, Perf).
3.  **Observability:** Expose standard metrics (Red/USE methods) and traces; maintain updated dashboards.
4.  **SLO Ownership:** Define and defend SLOs. If error budget is exhausted (>100% burn), you halt feature work to fix reliability.
5.  **Cost Responsibility:** Stay within defined cost-per-unit metrics.
6.  **Support:** Provide 24/7 on-call coverage for your services (DRI model).

## Deviations (The "Break Glass" Clause)
If the paved road does not meet your needs, you may deviate (e.g., use Go instead of Node, or MongoDB instead of Postgres) **IF AND ONLY IF**:
1.  **ADR:** You publish an Architecture Decision Record (ADR) justifying the change.
2.  **Justification:** You provide evidence that the standard solution is insufficient (e.g., performance benchmarks).
3.  **Ownership:** You accept full responsibility for the bespoke infrastructure (no central support).
4.  **Cost/SLO Analysis:** You demonstrate that the deviation will not negatively impact cost or reliability.

## Enforcement
*   **CI/CD:** Automated gates enforce policies. You cannot bypass them without an emergency override (which triggers an audit).
*   **Review:** Quarterly operational reviews will assess compliance. Repeated violations may result in revoked autonomy (return to gated deployments).

---
*By pushing code to this repository, you accept these terms.*

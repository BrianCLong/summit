# Prioritization Rules & Ownership

This guide defines consistent severity, priority, and ownership rules for production feedback. Apply these rules before any work begins.

## Severity Definitions

- **P0 (Critical):** Production outage, data loss risk, security exposure, SLA breach, or regulatory non-compliance. Immediate page; freeze non-critical deploys until mitigated.
- **P1 (High):** Major functionality degraded for multiple tenants or strategic accounts; no immediate data loss. Expedited fix in current/next patch train.
- **P2 (Standard):** Usability issues, low-frequency defects, or feature gaps with workarounds; schedule in minor/major release planning.

## Priority Inputs

1. **Customer/SLA impact:** Strategic/enterprise customers or contractual penalties elevate priority within severity band.
2. **Blast radius:** Multi-tenant or global impact raises priority.
3. **Regression risk:** Newly shipped code triggering issue increases urgency and requires regression proof.
4. **Operational cost:** Performance/cost spikes with projected budget impact prioritize within P1/P2.
5. **Signal quality:** Issues detected by automated monitors with clear evidence are fast-tracked.

## Ownership Model

- **Owner:** Functional DRI for impacted surface (API/UI/data-plane/control-plane/policy-engine/docs/infra).
- **Backup:** Named secondary who can assume control for P0/P1 within 30 minutes.
- **Release Captain:** Approves lane selection (fast patch vs minor vs major) and verifies gates.
- **Customer Liaison:** Ensures customer-facing updates align with `CLOSURE_PROCESS.md`.

## Assignment Rules

- The first capable on-call in the impacted surface owns the P0 until relieved by the DRI.
- Ownership transfers must be recorded on the intake card with timestamp and acknowledger.
- A missing backup is a policy violation; escalate to functional leader.

## Priority & Decision Records

- Every card must include a brief decision record:
  - **Why now vs later:** SLA, cost, or risk justification.
  - **Selected lane:** patch/minor/major per `docs/release/RAPID_RELEASE.md`.
  - **Verification plan:** Tests, dashboards, or probes to prove regression safety.
- For items deferred beyond one release train, attach explicit acceptance of risk from the product owner.

## SLA Mapping

- **P0:** Mitigation ≤ 2 hours; permanent fix targeted in next patch train with regression proof.
- **P1:** Fix targeted within 2 business days or next scheduled patch train.
- **P2:** Planned in quarterly/semester roadmap with customer visibility.

## Governance

- Severity downgrades require Release Captain approval.
- Any P0/P1 without evidence or owner after SLA triggers an incident-level RCA focused on feedback-loop gaps.
- All decision records are stored with the card and mirrored in weekly operating review.

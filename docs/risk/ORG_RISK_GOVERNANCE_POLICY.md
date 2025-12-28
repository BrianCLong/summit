# Summit Risk Governance Policy

**Last updated:** 2025-12-27
**Owner (role):** Organization-Wide Risk Systems Owner

## Purpose

Define how Summit maintains a single, decision-quality, organization-wide risk
register and heatmap system that informs product decisions, capital allocation,
velocity limits, and external representations.

## Decision rights and responsibilities

- **Risk Systems Owner:** Maintains the master register, heatmaps, and executive
  memo; convenes reviews; ensures risks are observable and owned.
- **Risk Owners (role):** Accountable for detection, mitigation, and updates for
  assigned risks.
- **Product Leadership:** Uses register to gate graduation, roadmap, and claims.
- **Engineering Leadership:** Uses register to set velocity limits, WIP, and
  release gates.
- **Compliance & Security Leadership:** Ensures policy-as-code coverage and
  evidence freshness; escalates breaches.

## Update cadence

- **Master register:** Weekly refresh.
- **Heatmaps:** Weekly refresh, synchronized with register updates.
- **Executive risk memo:** Monthly or upon material change.
- **Quarterly audit:** Cross-check risk entries against policy-as-code evidence
  and control drift reports.

## Risk intake and retirement

- **New risks:** Added via RFC or incident/postmortem review, with owner and
  detection mechanism defined before acceptance.
- **Retirement:** Risk can be archived when triggers are eliminated and evidence
  shows sustained stability for two consecutive review cycles.

## Unacceptable risk criteria

A risk is **unacceptable** if any of the following is true:

- Current Risk Level is **Severe**.
- It affects GA lane with **High Impact** and **High Likelihood**.
- It violates a legal or regulatory requirement not expressible as
  policy-as-code (implementation is incomplete).
- It produces a breach of trust commitments or public claims.

## Escalation and halt authority

- **Who can halt work:** Risk Systems Owner, CTO, CISO, Compliance Lead.
- **Escalation path:** Risk owner → Risk Systems Owner → Executive Council.
- **Response SLA:** 24 hours for High/Severe risks; 72 hours for Medium.

## Mitigation prioritization

1. **Safety/Trust:** Security, data leakage, and governance drift.
2. **Decision integrity:** Product misrepresentation and UX authority risks.
3. **Reliability:** SLO and performance risks.
4. **Delivery health:** Lane overload, review bottlenecks.
5. **Strategic capital:** Over/under investment alignment.

## Risk acceptance rules

- Acceptance must be explicit and recorded in the **risk acceptance log** with
  rationale, duration, and compensating controls.
- Acceptance requires sign-off from the risk owner and the Risk Systems Owner.
- Expired acceptances trigger re-evaluation within 5 business days.

## Integration with existing systems

- **Graduation pipeline:** Graduation gates include risk-level checks; any High
  or Severe risks in GA lane require explicit sign-off and mitigation plan.
- **Velocity & capacity:** WIP limits and staffing allocations adjust based on
  risk density in heatmaps.
- **Investment & capital:** Capital requests must cite register impacts and ROI
  deltas for mitigations.
- **Product narrative & claims:** Claims must link to evidence IDs and risk
  register alignment; misrepresentation risks block publication.
- **Audit/compliance workflows:** Policy-as-code controls and evidence freshness
  reports are mandatory detection mechanisms for governance risks.

## Governance records

- **Record of decision:** Each risk update includes reviewer, date, and status.
- **Evidence linkage:** All risks include detection mechanisms tied to dashboards
  or controls.

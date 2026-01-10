# Truth Impact Containment Protocol

**Contain the lie, don’t chase it.** When compromised inputs are detected, Summit contains downstream impact, freezes dependent decisions, and orchestrates recovery without panic.

## Objectives

- Halt propagation of decisions derived from compromised evidence.
- Preserve auditability and re-evaluation paths.
- Notify operators with actionable remediation steps, not noise.

## Containment Flow

1. **Trigger**: detection event (integrity <40, authority break, poisoning alert, narrative collision) fires a containment ticket.
2. **Scope**: trace decisions, reports, and exports that consumed the compromised inputs via provenance links.
3. **Quarantine**: freeze affected automations and mark downstream data products as "under review".
4. **Substitute**: seek alternate sources or narrative variants to rebuild integrity.
5. **Re-evaluate**: rerun impacted decisions with validated inputs; record deltas.
6. **Release**: lift quarantine once authority and integrity thresholds are re-established.

## Controls

- **Decision Quarantine Queue**: prioritized backlog with SLA timers.
- **Propagation Blockers**: prevent publishing/export when upstream integrity is below policy thresholds.
- **Revocation Broadcasts**: emit change events to dependent systems with remediation guidance.
- **Strategic Silence**: authorized non-response when evidence is insufficient; logged with justification.

## Metrics

- Number of quarantined decisions per adversarial class
- MTTR to restore decisions and lift quarantine
- False-positive rate of containment triggers
- Downstream propagation prevented (volume and impact)

## Audit & Governance

- Every containment action is written to the **Authority Continuity Ledger** with actor, rationale, and rollback plan.
- Policy-as-code defines quarantine entry/exit criteria, SLA expectations, and notification routes.

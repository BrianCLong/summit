# Velocity & Planning Playbook

## Purpose

Provide a concise, repeatable planning process that makes delivery capacity explicit,
prevents overcommitment, and handles reality with auditability.

## Planning Cadence (Per Sprint)

1. **Capacity intake** (EW + RH) using `docs/velocity/CAPACITY_MODEL.md`.
2. **Dependency mapping** (see `docs/velocity/DEPENDENCY_RULES.md`).
3. **Lane allocation** by rule-based split (GA / GA-adjacent / EXP).
4. **WIP validation** against `docs/velocity/LANE_WIP_POLICY.md`.
5. **Commitment labeling** (Committed vs Stretch).
6. **Leadership review** and sign-off.

## Work Intake Rules

- Every initiative must have:
  - Lane assignment (EXP, GA-adjacent, GA)
  - Capacity allocation (EW + RH)
  - Explicit dependencies (FE↔BE, shared reviewers, CI)
  - Graduation requirements (if applicable)

## Commitment Levels

- **Committed:** capacity and dependencies are fully funded, WIP slots available, and
  graduation requirements budgeted.
- **Stretch:** capacity exists but dependencies or governance constraints are at risk.
- **Exploratory:** bounded spikes only; must remain within EXP WIP limits.

## Graduation & Governance Handling

- Graduation evidence, audits, and contract updates are **first-class work**.
- Graduation tasks **must** be capacity-reserved and cannot be deferred to “make room.”
- All compliance-relevant decisions must be logged and expressed as policy-as-code.

## Reality Handling (Reforecasting)

Reforecasting is mandatory when any of the following occurs:

- GA incident load exceeds reserved capacity.
- Review-hour utilization exceeds 90% of budget.
- CI queue times exceed agreed thresholds for 3 consecutive days.
- Graduation backlog grows > 2× baseline.

**Process:**

1. Freeze new intake for affected lane.
2. Recompute remaining EW/RH.
3. Re-label commitments as needed (Committed → Stretch).
4. Update sprint plan with justification.

## Preventing Overcommitment

- WIP limits are enforced at intake.
- Capacity is validated **before** work starts.
- Review-hours are tracked and capped per reviewer.
- Unplanned work requires explicit de-scoping elsewhere.

## Memory & Traceability

- Sprint plans must link to capacity calculations.
- Decisions that affect governance or compliance require audit logs.
- Changes to commitments are documented in sprint notes.

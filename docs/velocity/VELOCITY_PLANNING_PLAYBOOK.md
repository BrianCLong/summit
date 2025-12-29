# Velocity Planning Playbook

## How work is planned

### Inputs

- **Roadmap + strategy:** `docs/sprints/SPRINT_N_PLUS_7_ROADMAP.md`, `docs/roadmap/STATUS.json`.
- **Governance:** `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`,
  `docs/governance/RULEBOOK.md`.
- **Delivery signals:** incident reviews, customer commitments, and platform metrics.
- **Graduation work:** readiness criteria, hardening, and compliance sign-offs.

### Dependency mapping

- Maintain a dependency map (initiative → epic → work items) with explicit blockers and owning
  teams.
- Flag cross-zone dependencies and document the coupling decision before scoping.
- Require a clearly defined “critical path” for each sprint plan.

### Governance steps

1. Validate work aligns with mandated roadmaps and governance artifacts.
2. Confirm regulatory logic is expressed as policy-as-code where applicable.
3. Document compliance review decisions and log owners.
4. Only plan items that can satisfy the Golden Path and production-readiness constraints.

## How priorities are tracked and remembered

### Single source of truth

- `docs/roadmap/STATUS.json` is the canonical record of epic status and ownership.
- Sprint artifacts (boards, tickets) must reference the IDs in `STATUS.json`.

### Cadence

- Weekly: update priorities, dependencies, and confidence levels.
- Mid-sprint: checkpoint progress and risk re-evaluation.
- Sprint close: reconcile delivery vs. commitments and update the next plan.

## How overcommitment is prevented

### Capacity gate

- Lock capacity before sprint start: available hours minus planned maintenance, support, and
  **graduation work** reserve.
- Require explicit approval for any scope exceeding available capacity.

### WIP enforcement

- Limit work-in-progress per team (e.g., max 1–2 concurrent epics or features).
- Block new work intake when WIP limits are exceeded unless a swap is approved.

## How plans are revised when reality changes

### Reforecasting triggers

- New critical incidents or security findings.
- Dependency delays that impact the critical path.
- Graduation work expanding due to compliance or quality gaps.
- Missed milestones or materially changed estimates (>20%).

### Reforecasting actions

- Re-estimate impacted work, adjust scope, and update confidence levels.
- Re-validate capacity gates and WIP limits.
- Update `docs/roadmap/STATUS.json` and notify stakeholders.

## Commitment confidence levels

| Level           | Definition                                    | Criteria                                                                                         |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Committed**   | Delivery is expected within the sprint.       | Dependencies cleared, owners assigned, capacity reserved, and tests/acceptance criteria defined. |
| **Stretch**     | Delivery is possible but not guaranteed.      | At least one dependency unresolved, partial capacity reserved, or estimates have high variance.  |
| **Exploratory** | Discovery-only work with no delivery promise. | Scope or feasibility unknown; used for spikes or prototyping.                                    |

## Graduation work impact

- Graduation work (hardening, compliance, documentation, release readiness) must be explicitly
  reserved as capacity before feature planning.
- Treat graduation tasks as critical-path items with their own confidence level.
- Graduation overruns trigger reforecasting and may preempt feature scope to protect release dates.

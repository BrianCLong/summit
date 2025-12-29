# Organization-Wide Capacity Model

## Purpose

Establish a shared, auditable model for delivery capacity that is explicit, forecastable,
and protected from scope creep. This model treats velocity as infrastructure and ensures
commitments are realistic, risk-aware, and sustainable.

## Capacity Unit (Hybrid)

**Unit:** _Engineer-week + review-hour hybrid_

- **Engineer-week (EW):** 1 engineer × 1 week of focused delivery time.
- **Review-hour (RH):** 1 hour of review/approval, governance, or audit work.

**Conversion rule:** 1 EW = 30 delivery hours (net) and **excludes** review/approval load.
Review-hours are **budgeted separately** to avoid hidden governance debt.

## Capacity Accounting Flow

1. **Start with total team EW** (based on headcount × sprint duration).
2. **Subtract fixed reservations** (non-negotiable).
3. **Allocate remaining EW** across lanes using rule-based allocation.
4. **Apply WIP limits** (see `docs/velocity/LANE_WIP_POLICY.md`).
5. **Validate review-hour budget** before commitments are accepted.

## Fixed Capacity Reservations (Non-Optional)

These reservations are protected capacity and **cannot** be reallocated without an
explicit escalation.

| Reservation Type                                  | Default Allocation            | Notes                                              |
| ------------------------------------------------- | ----------------------------- | -------------------------------------------------- |
| GA stability & incident response                  | 20% of EW                     | Covers on-call, hotfixes, and reliability work.    |
| Contract maintenance (FE + BE)                    | 10% of EW                     | Keeps GA contracts, schemas, and policies aligned. |
| Graduation pipeline (evidence, audits, contracts) | 15% of EW                     | Includes evidence creation and audits.             |
| Review & approval duties                          | **Review-hours:** 6 RH per EW | Separate RH budget to prevent hidden load.         |
| CI/testing/ops drag                               | 10% of EW                     | Accounts for build/test/ops overhead.              |

**Result:** By default, **55% of EW** is reserved before lane allocation. Remaining EW is
variable capacity.

## Variable Capacity Allocation (Rule-Based)

Remaining capacity is allocated by lane type using fixed ratios that are reviewed quarterly.

**Default split of remaining EW:**

- **GA lane:** 50%
- **GA-adjacent lane:** 35%
- **Experimental lane:** 15%

**Adjustments:**

- If GA incident rate exceeds SLO thresholds for two consecutive weeks, shift **+10% EW**
  from Experimental to GA for the next sprint.
- If graduation backlog exceeds 2× baseline (see graduation queue metrics), shift **+5% EW**
  from GA-adjacent to Graduation reservations in the next sprint.

## Assumptions & Constraints

- Delivery time per EW is capped at **30 hours** to preserve review, recovery, and sustainability.
- Review hours are **first-class capacity** and cannot be implicitly borrowed.
- CI and operational drag are assumed **structural**, not incidental.
- Capacity model is team-agnostic but requires local calibration for new teams.

## Data Inputs (Required)

- Sprint headcount and allocation map
- On-call and incident hours (last 2 sprints)
- Review-hour utilization (per reviewer)
- Graduation queue size and age
- CI queue times and build failure rates

## Update Cadence & Ownership

- **Update cadence:** Each sprint planning cycle.
- **Owners:** Engineering Director + Program Management Lead.
- **Update rules:** Changes require a documented rationale and must be recorded in the
  sprint planning notes.

## Governance Notes

This model is subject to the Constitution of the Ecosystem and the Law of Consistency.
Any regulatory or compliance requirement must be expressed as policy-as-code or it is
considered incomplete.

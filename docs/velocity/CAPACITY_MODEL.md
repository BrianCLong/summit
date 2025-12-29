# Capacity Model (Engineer-Weeks + Review-Hours Hybrid)

## Purpose

This document defines a repeatable capacity model for Summit/IntelGraph delivery planning.
The model is intentionally mechanical: capacity is measured in **engineer-weeks (EW)** for
execution and **review-hours (RH)** for compliance, approvals, and governance checks.

## Unit of Capacity

- **Engineer-Week (EW):** 1 engineer working 40 hours in a sprint week on delivery work.
- **Review-Hour (RH):** 1 hour of formal review/approval time (design reviews, code reviews,
  compliance checks, governance sign-off).

**Hybrid Capacity Formula (per sprint):**

```
Total Capacity = (Team Engineers × Sprint Weeks × 1.0 EW) + Review Pool (RH)
```

- Review Pool is tracked separately to avoid masking delivery bandwidth.
- Review work is **not** convertible to EW unless explicitly approved by governance.

## Fixed Capacity Reservations (Mandatory)

The following reservations are **always applied** before any allocation to lanes.
Each is expressed as a percentage of EW and a minimum RH reservation.

| Reservation                               | EW (%) | RH (min) | Notes                                                       |
| ----------------------------------------- | ------ | -------- | ----------------------------------------------------------- |
| GA stability & incident response          | 20%    | 12 RH    | On-call rotation, hotfixes, regression triage.              |
| Contract maintenance (frontend + backend) | 15%    | 8 RH     | SLA-bound obligations, contract regressions.                |
| Graduation pipeline work                  | 10%    | 6 RH     | Graduation readiness, audits, certifications.               |
| Review/approval duties                    | 0%     | 16 RH    | Architecture, security, governance, policy-as-code reviews. |

**Fixed Reservation Rule:**

1. Deduct EW percentage reservations from total EW.
2. Reserve RH minimums from the review pool before any discretionary reviews.

## Variable Capacity Allocation Rules (Lane Distribution)

After fixed reservations are applied, remaining EW is distributed **by rule**:

1. **EXP Lane (Exploration): 20% of remaining EW**
2. **GA-Adjacent Lane: 30% of remaining EW**
3. **GA Lane (Production/GA roadmap): 50% of remaining EW**

**Rounding Rule:**

- Round to the nearest 0.25 EW.
- If rounding creates a remainder, allocate remainder to GA lane.

**Review Allocation Rule:**

- Remaining RH after fixed reservations is split **40% GA**, **35% GA-adjacent**, **25% EXP**.
- If RH is constrained, GA lane receives priority for approval queues.

## Assumptions & Constraints

- **Team size baseline:** 10 engineers (adjustable per sprint).
- **Sprint cadence:** 2-week sprints.
- **Historical throughput:** 0.8 EW of usable delivery per engineer-week after context switching.
- **CI drag:** average 6% of EW lost to pipeline retries and flaky tests.
- **Governance overhead:** minimum 16 RH per sprint for mandated reviews.
- **Policy-as-code requirement:** all compliance decisions must map to policy-as-code artifacts.
- **No hidden capacity:** ad-hoc work must be tagged into one of the fixed reservations.

## Appendix: Updating Assumptions Each Sprint

**Owner:** Delivery Ops (primary) with Governance Council co-sign.

**Update Cadence:** Every sprint planning meeting.

**Update Steps:**

1. Pull latest team roster and confirm active engineers.
2. Validate prior sprint EW burn and RH usage.
3. Recalculate CI drag using pipeline metrics.
4. Adjust governance overhead based on review queue backlog.
5. Record updates in this document and log the change in sprint notes.

**Change Log Requirements:**

- Update the assumptions in-place.
- Add a short entry in the sprint planning notes linking to this file.
- Notify governance if any assumption changes by more than 10%.

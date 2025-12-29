# Lane Capacity & WIP Policy

## Purpose

Define explicit Work-In-Progress (WIP) limits for EXP, GA-adjacent, and GA lanes to
prevent hidden overcommitment and reduce systemic risk.

## Lane Types

- **EXP (Experimental):** exploratory work, prototypes, research spikes.
- **GA-adjacent:** work that is near GA readiness, validation, or hardening.
- **GA:** production-critical work, stability, and contractual deliverables.

## WIP Limits (Per Team)

| Lane        | Max Concurrent Initiatives | Notes                                     |
| ----------- | -------------------------- | ----------------------------------------- |
| EXP         | 1                          | EXP must remain small and reversible.     |
| GA-adjacent | 2                          | Protects graduation throughput.           |
| GA          | 1                          | Focused delivery for stability and trust. |

## WIP Limits (Global)

| Lane        | Global Cap | Notes                                       |
| ----------- | ---------- | ------------------------------------------- |
| EXP         | 6          | Prevents EXP from crowding out GA.          |
| GA-adjacent | 8          | Balances graduation and hardening.          |
| GA          | 4          | Preserves focus on quality and reliability. |

## Enforcement Rules

- Work **cannot start** without available capacity **and** WIP slots.
- All initiatives must be tied to an approved lane and recorded in the sprint plan.
- Review-hour budgets (RH) must be available before any initiative is accepted.

## When Limits Are Reached

1. **Pause intake** for that lane.
2. **Swap out** lower-priority work if necessary.
3. **Escalate** to Engineering Director + PM Lead if priority conflicts persist.

## Escalation Path

- **Primary:** Engineering Director + Program Management Lead
- **Secondary:** Governance Council for capacity exceptions

## Compliance Note

Starting work without capacity violates the Law of Consistency and is treated as a
planning defect, not a delivery issue.

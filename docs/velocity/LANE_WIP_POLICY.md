# Lane WIP Policy (Initiative Concurrency)

## Purpose

This policy sets explicit work-in-progress (WIP) limits for initiative intake across delivery lanes
and defines enforcement, escalation, and arbitration when limits are reached.

## Scope

Applies to all product and engineering initiatives entering delivery, including cross-functional
workstreams. These limits are enforced at intake, planning, and ongoing execution.

## Lanes

- **EXP (Experimental):** Time-boxed discovery, spikes, prototypes.
- **GA-adjacent:** Pre-GA hardening, enablement, performance, and readiness work.
- **GA:** Customer-committed, production-grade delivery.

## Max Concurrent Initiatives

Limits apply simultaneously **per team** and **globally** across all teams.

| Lane        | Per-Team Cap | Global Cap | Notes                                      |
| ----------- | ------------ | ---------- | ------------------------------------------ |
| EXP         | 2            | 8          | Short cycles; stop if exit criteria unmet. |
| GA-adjacent | 2            | 6          | Must map to GA readiness outcomes.         |
| GA          | 1            | 4          | Highest priority, lowest parallelism.      |

### Counting Rules

- An initiative is counted once it has a named owner, scope, and a scheduled sprint.
- If an initiative spans multiple teams, it counts against each team involved **and** the global cap.
- Paused initiatives remain counted unless formally removed from the plan.

## When Limits Are Reached

- **Pause intake:** New initiatives wait until capacity frees.
- **Swap out:** Replace lower-impact initiatives with higher-priority work (documented in the plan).
- **Formal escalation:** If business-critical work must proceed, escalate per the path below.

## Enforcement Rules

- **Planning gate:** Sprint planning must confirm lane caps before work starts.
- **Capacity tracking required:** Initiatives must have updated capacity status to start or continue.
- **No silent overrides:** Any exception requires a written waiver and escalation approval.
- **Weekly audit:** Program ops validates counts against the caps.

## Escalation & Arbitration

- **First stop:** Engineering Director + PM Lead for the affected domain.
- **Second stop (tie-break):** VP Engineering + Head of Product.
- **Recordkeeping:** Decisions are logged in the roadmap status tracker with rationale.

## Review Cadence

- Re-evaluate caps quarterly or after major delivery changes.

## Ownership

- **Process owner:** Engineering Director
- **Policy steward:** Program Operations

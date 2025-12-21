# Toil: Definition & Governance

## Definition
**Toil** is work that is:
1. **Manual**: Requires human intervention.
2. **Repetitive**: Performed multiple times with little variation.
3. **Automatable**: Can be done by a machine.
4. **Low-value**: Does not advance the core business value or feature set.
5. **Tactical**: Interrupt-driven and reactive.
6. **Scales with service growth**: Increases linearly with traffic or data size.

## Toil Budget
Each team has a **Toil Budget** to ensure engineering time is spent on engineering, not ops.
- **Max Hours/Week**: 50% of on-call time, or capped at specific hours/sprint (e.g., 6 hours).
- **Enforcement**: If toil exceeds the budget, feature work stops until toil is reduced.

## Tracking
We instrument on-call load and track toil via:
- **PagerDuty/OpsGenie Integration**: Analyzing alert volume.
- **Toil Diary**: Periodic manual logging of interrupts.
- **Toil Service**: Centralized API for logging toil events.

## Exceptions Registry
Manual processes that cannot yet be automated must be registered in the **Exceptions Registry** with:
- **Owner**: Who owns this process.
- **Justification**: Why it cannot be automated yet.
- **Expiry Date**: When this exception expires (must be re-evaluated).

## Metrics
- **Toil %**: Time spent on toil / Total time.
- **MTTA/MTTR**: Mean Time To Acknowledge/Resolve.
- **Interrupts/Week**: Count of context switches.

## Goal
Reduce toil to < 50% of operations work. Delete 10 noisy alerts immediately.

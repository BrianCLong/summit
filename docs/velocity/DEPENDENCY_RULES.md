# Cross-Team Dependency Rules

## Purpose

Define explicit planning rules for cross-team dependencies, shared reviewers, and
shared CI/infrastructure constraints. Unplanned dependencies are a primary risk vector.

## Dependency Mapping Requirements

Every initiative must document:

- **Frontend ↔ Backend dependencies** (API contracts, schema changes, shared services).
- **Review dependencies** (required reviewers, approvers, governance councils).
- **CI/infrastructure dependencies** (shared pipelines, build queues, test environments).

## Contention Identification

During planning, identify:

- Review bottlenecks (single points of approval).
- CI queue saturation risks.
- Shared service change collisions.

## Resolution Rules

1. **GA work has priority** over GA-adjacent and EXP.
2. **Graduation work is non-negotiable** and cannot be displaced.
3. If two initiatives contend for the same dependency:
   - Prefer the initiative with higher lane criticality (GA > GA-adjacent > EXP).
   - If equal, prefer the initiative with lower review-hour demand.
   - If still tied, defer by lottery only after escalation.

## Shared Reviewer Safeguards

- Maximum **8 review-hours per reviewer per week**.
- No reviewer can approve more than **2 concurrent GA initiatives**.
- Review capacity must be reserved before commitments are accepted.

## Shared CI/Infrastructure Safeguards

- If CI queue time exceeds thresholds, pause EXP intake.
- If build failure rate exceeds 10% over 7 days, allocate GA capacity to stabilize.

## Escalation Path

- Engineering Director + PM Lead for disputes.
- Governance Council for policy or compliance conflicts.

# Codex Task: Repo Consistency and Technical Debt Sweep

**Priority:** P1/P2  
**Labels:** `codex`, `tech-debt`, `refactor`, `maintenance`

## Desired Outcome

Reduce drift by removing duplicate schemas, dead code, and test gaps while publishing a debt report.

## Workstreams

- Detect and consolidate duplicate schemas.
- Remove dead code and stale utilities.
- Enforce naming conventions for touched surfaces.
- Add missing tests for retained logic.
- Publish technical debt report.

## Key Deliverables

- Duplicate schema inventory and consolidation patch.
- Dead code removal PR with behavior-preserving validation.
- Coverage deltas for touched modules.
- `docs/tech-debt.md` report with next-pass queue.

## Acceptance Criteria

- No duplicate schemas remain in scoped surfaces.
- Coverage increases for touched modules.
- `docs/tech-debt.md` committed with findings and follow-up actions.

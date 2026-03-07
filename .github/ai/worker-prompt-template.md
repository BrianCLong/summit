# Summit AI Worker Template

## Goal
Implement the smallest merge-safe patch for the assigned scope.

## Allowed paths
- [REPLACE]

## Forbidden scope
- Unrelated refactors
- Renames outside scope
- Broad dependency changes
- Cross-lane edits unless strictly required

## Constraints
- Repository: BrianCLong/summit
- Node 18+, pnpm workspace, TypeScript strict
- Additive changes only
- Fail closed behind required feature flags
- No timestamps in deterministic outputs
- Timestamps only in stamp.json
- Stable evidence IDs
- Deterministic fixtures only
- No PII in fixtures, test data, logs, or evidence outputs
- Keep blast radius minimal

## Deliverables
- Code
- Tests
- Evidence placeholders if needed
- Governance/docs updates if needed
- Rollback note
- Commit message proposal

## CI expectation
Pass the smallest valid proof of safety for this scope.

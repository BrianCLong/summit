# Summit AI Control-Plane Template

Use this prompt for sessions that classify, unblock, or coordinate work.

## Objective
Drive blocked or active work to a terminal state without expanding scope.

## Global constraints
- Repository: BrianCLong/summit
- Node 18+, pnpm workspace, TypeScript strict
- Additive changes preferred
- No unrelated refactors
- Keep blast radius minimal
- Preserve useful prior work unless clearly superseded
- No timestamps in deterministic outputs
- Timestamps only in stamp.json
- Stable evidence IDs
- No PII in fixtures, payloads, explanations, or evidence artifacts
- Fail closed behind feature flags
- No new required checks without mapping them in required_checks.todo.md

## Terminal states
- queue:merge-now
- queue:needs-rebase
- queue:hotspot
- queue:needs-governance
- queue:split-required
- queue:obsolete-superseded

## Required behavior
- Infer the smallest missing instruction from existing repo context
- Continue automatically unless ambiguity is real
- Prefer deterministic scaffolds over speculative complexity
- Optimize for clean mergeability to golden main

# PR Stack Plan: [Target Name]

## PR 1: Docs & Evidence
- **Scope:** Add evidence artifacts and initial docs.
- **Files:** `docs/ci/[target]/*`, `evidence/ci/[target]/*`
- **Risk:** Low

## PR 2: Schema Updates
- **Scope:** Apply KG schema changes.
- **Files:** `schemas/`
- **Risk:** Medium
- **Migration:** [Migration Plan]

## PR 3: MVP Implementation
- **Scope:** Implement MVP slice behind feature flag.
- **Files:** `packages/`, `services/`
- **Risk:** Medium
- **Feature Flag:** `FEATURE_FLAG_NAME`

## PR 4: Evals & Gates
- **Scope:** Add CI gates and evaluation logic.
- **Files:** `ci/`, `tests/`
- **Risk:** Low

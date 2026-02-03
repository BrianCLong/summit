# Summit Dynamic Intent — Module Map (Deferred pending repo validation)

## Readiness Reference

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`

## Purpose

Establish a single, authoritative map of where Dynamic Intent artifacts and runtime components
live in the Summit repository. This document is intentionally constrained until exact module
locations are validated.

## Status

- Validation: Deferred pending module path confirmation.
- Owner: Deferred pending assignment from `docs/roadmap/STATUS.json`.

## Module Map (placeholders; replace with confirmed paths)

### Artifacts & Schemas

- Storyboard schema: `schemas/dynamic_intent/storyboard.schema.json` (TBD)
- Ambiguity schema: `schemas/dynamic_intent/ambiguity.schema.json` (TBD)
- Clarification turn schema: `schemas/dynamic_intent/clarification_turn.schema.json` (TBD)
- Intent memory schema: `schemas/dynamic_intent/intent_memory.schema.json` (TBD)
- Refinement op schema: `schemas/dynamic_intent/refinement_op.schema.json` (TBD)

### Evidence Bundle

- Evidence root: `evidence/` (TBD)
- Evidence schemas: `evidence/schemas/` (TBD)

### Runtime Skeleton (no model calls)

- Clarification loop: `src/dynamic_intent/clarification/` (TBD)
- Refinement loop: `src/dynamic_intent/refinement/` (TBD)
- Renderer adapters: `src/render/` (TBD)

### Fixtures & Harnesses

- Storyboard fixtures: `fixtures/storyboards/` (TBD)
- Ambiguity fixtures: `fixtures/ambiguities/` (TBD)
- Refinement fixtures: `fixtures/refinements/` (TBD)

## Validation Checklist (replace when paths confirmed)

- [ ] Confirm canonical location for `dynamic_intent` runtime package.
- [ ] Confirm evidence bundle directory and schema registry.
- [ ] Confirm fixtures location and naming convention.
- [ ] Confirm CI gate ownership and required check names.

## Next Actions (governed)

1. Resolve module paths and update the placeholders above.
2. Register authoritative required checks in `required_checks.todo.md`.
3. Update `docs/roadmap/STATUS.json` with the assigned owner and milestone.

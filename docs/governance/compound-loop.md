# Compound Loop Governance (Plan → Work → Assess → Compound)

This document defines the Summit-native governance contract for the compound engineering loop.
It asserts the present state and dictates the forward requirements for evidence capture and validation.

## Readiness alignment

This contract aligns to the Summit Readiness Assertion for deterministic, evidence-first delivery.
See: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Evidence contract (Lane 1)

Required artifacts (deterministic, deny-by-default):

- `report.json`: plan, work summary, assess rubrics, compound memory updates.
- `metrics.json`: counts and outcome metrics.
- `stamp.json`: timestamps and git provenance only.
- `index.json`: Evidence ID map for the bundle.

All artifacts must:

- Conform to the JSON schemas under `src/agents/compound/evidence/schemas/`.
- Use `additionalProperties: false` for strict validation.
- Avoid timestamps outside `stamp.json`.

## Evidence IDs

Evidence IDs follow:

`EVD-CLAUDE-COMPOUND-<AREA>-<NNN>`

Areas: PLAN, WORK, ASSESS, MEMORY, METRICS, STAMP, SEC, DEPS.

## Governance gates (phased)

- Phase 1: warn-only validation (COMPOUND_GATES_ENFORCE=0).
- Phase 2: enforcement after required check names are confirmed.

## MAESTRO security alignment

- **MAESTRO Layers**: Foundation, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt bypass, evidence forgery, timestamp leakage, secret leakage.
- **Mitigations**: schema validation, deterministic emitters, timestamp isolation, deny-by-default gates.

## Rollback posture

Enforcement can be disabled with a one-line environment flip in the gate workflow. Rollback is
intentionally constrained to maintain determinism.

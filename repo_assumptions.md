# Repo Assumptions & Validation Baseline

## Status

This file captures **current verified facts** and **deferred validations** for intent-engineering integration work.

## Verified Paths

Validated from repository root:

- `.github/workflows/`
- `docs/`
- `docs/standards/`
- `docs/security/data-handling/`
- `docs/ops/runbooks/`
- `scripts/`
- `schemas/`
- `tests/`

## Deferred Pending Validation (Before Merge-Critical Changes)

1. Existing evidence ID schema format and naming rules.
2. Canonical CI job/check names enforced by branch protection.
3. Current JSON output conventions for deterministic artifacts.
4. Deterministic artifact stamping rules (what may vary and where).
5. Feature-flag framework and authoritative config source.

## Must-Not-Touch Until Explicitly Confirmed

- Core evaluation engine internals.
- Existing CI matrix topology and required-check wiring.
- Security policy files and governance gates.

## Working Guardrails

- Keep scope to validation-first intent integration.
- Default feature flag posture: `INTENT_ENGINE_V1=OFF`.
- No autonomous runtime behavior in this phase.
- No unrelated refactors while establishing baseline gates.

# Repo Assumptions — Vercel v0 “90% Problem” Subsumption

## Summit Readiness Assertion
This initiative is executed under the Summit Readiness Assertion and inherits its authority for governance posture and evidence discipline. Refer to `docs/SUMMIT_READINESS_ASSERTION.md` for the binding readiness posture and escalation expectations.

## Source Map (Canonical Inputs)
The repo-shaped subsumption plan references a user-provided “canonical path map.” This document captures the bounded set of verified items and the deferred validation set that must be resolved before PR1 merges.

### Verified (from provided map)
- CI layout under `.github/workflows/` with reusable workflow variants.
- Policies under `.github/policies/`.
- Scripts under `.github/scripts/`.
- Modules under `src/api`, `src/agents`, `src/connectors`, `src/graphrag`.
- Tests under `tests/` and executed via `pnpm test*`.

### Deferred Pending Validation (must confirm in repo)
- Exact workflow filenames (e.g., `ci-core.yml` or equivalent).
- Existing agent framework entrypoints under `src/agents/`.
- Existing policy engine usage and enforcement hooks (OPA or custom).
- Package scripts and test runner wiring in `package.json`.

### Intentionally Constrained (must not touch until validated)
- Any logic under `src/graphrag/` (core retrieval logic).
- Production connectors and integration bindings.
- Existing CI workflows, except via additive gates.

## Validation Checklist (before PR1 merges)
1. List workflows under `.github/workflows/`.
2. Confirm test commands in `package.json`.
3. Confirm agent entrypoints under `src/agents/`.
4. Confirm any existing policy engine usage (OPA or custom rules).

## Scope Guardrails
- No refactors unless required to land the feature.
- Max 6 PRs in the stack, hard stop.
- All risky capabilities behind a feature flag default OFF.
- Clean-room implementation: ideas only, no proprietary behavior.
- Secrets and credentials are never logged or prompt-injected.

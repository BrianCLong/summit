# Repo Assumptions & Validation

## Scope

This document converts memory-layer planning assumptions into verified repository facts for deterministic implementation planning.

## Verified Runtime Entry Points

- `packages/agent-runtime/src/index.ts` exists and is a concrete agent runtime package entrypoint.
- `services/agent-runtime/src/index.ts` exists for a runtime service wrapper.
- `runtime/` exists but currently contains schemas/reports rather than executable runtime code.

## Verified CI Workflow Names (Memory-Relevant)

The following workflows are present under `.github/workflows/` and can host memory gates:

- `pr-quality-gate.yml`
- `agent-guardrails.yml`
- `api-determinism-check.yml`
- `ai-governance.yml`

## Verified Artifact Naming Conventions

- `evidence.json` is already used widely by scripts under `scripts/evidence/*` and `scripts/release/*`.
- `artifacts/` exists at repo root and is suitable for deterministic output files.

## Validation Checklist (Now Resolved)

Verified:
- [x] agent runtime path
- [x] CI workflow names
- [x] artifact naming conventions

Assumed (intentionally constrained pending implementation PR):
- [ ] final memory gate workflow name (`memory_regression_check` proposed)
- [ ] final evidence schema extension for memory artifacts

## Must-Not-Touch Files for MWS

- Existing policy engine core under `packages/agent-runtime/src/policy/`
- Security gate evaluators under `.github/workflows/*security*` and `scripts/evidence/*`
- Deterministic hashing helpers outside `runtime/memory/*`

## Immediate Next Step

Proceed with MWS memory module under `runtime/memory/` as default-OFF and artifact-emitting, then wire opt-in injection in a follow-up PR to `packages/agent-runtime`.

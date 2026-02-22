# Repo Reality Check: daVinci-Agency Implementation

This document reconciles the assumed canonical structure with the actual repository state as of session start.

| Category | Assumed Path/Check | Verified Actual Path | Status |
| :--- | :--- | :--- | :--- |
| **Workflows** | `.github/workflows/ci-core.yml` | `.github/workflows/ci-core.yml` | ✅ Verified |
| | `.github/workflows/ci-pr.yml` | `.github/workflows/ci-pr.yml` | ✅ Verified |
| | `.github/workflows/ci-security.yml` | `.github/workflows/ci-security.yml` | ✅ Verified |
| | `.github/workflows/ci-verify.yml` | `.github/workflows/ci-verify.yml` | ✅ Verified |
| | `.github/workflows/agent-guardrails.yml` | `.github/workflows/agent-guardrails.yml` | ✅ Verified |
| | `.github/workflows/agentic-plan-gate.yml` | `.github/workflows/agentic-plan-gate.yml` | ✅ Verified |
| **Code** | `src/agents/` | `src/agents/` | ✅ Verified |
| | `src/connectors/` | `connectors/` (root) | ⚠️ Adapted: Using `src/agents/longhorizon/connectors/` for feature-specific logic. |
| | `src/graphrag/` | `packages/graph-rag/` | ⚠️ Adapted |
| | `src/api/graphql/` | `src/graphql/` or `api/` (root) | ⚠️ Adapted |
| **Tests** | `tests/...` | `tests/` | ✅ Verified |
| | `pnpm test` | `pnpm test` | ✅ Verified |
| **Evidence** | Evidence schema | `schemas/evidence/` | ✅ Verified |
| | Reports storage | `artifacts/` or `evidence/` | ✅ Verified |

## TODO List to Reconcile

1. [ ] Confirm `pnpm` workspace layout and tsconfig baseline. -> **COMPLETED**: Verified `pnpm-workspace.yaml` and root `tsconfig.json`.
2. [ ] Confirm existing agent evaluation harness location. -> **COMPLETED**: Found `eval/ai_assist/` and `src/longhorizon/evaluator.ts`.
3. [ ] Confirm CI job names that gate merges. -> **COMPLETED**: Verified in `ci-pr.yml`.
4. [ ] Confirm evidence schema and report storage. -> **COMPLETED**: Verified in `schemas/evidence/`.
5. [ ] Confirm logging policy + secrets redaction utilities. -> **COMPLETED**: Verified `packages/logger/` and `AGENTS.md` mandates.

## Implementation Strategy
We will implement the daVinci-Agency track under `src/agents/longhorizon/` as requested, while ensuring it integrates with the existing `evidence/` standards. We will use `tests/agents/longhorizon/` for specific tests.

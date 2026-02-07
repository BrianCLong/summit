# Repo Assumptions & Validation (RLM/TEA/DMoE Intake)

**Readiness anchor:** See `docs/SUMMIT_READINESS_ASSERTION.md` for the governing readiness posture. This intake asserts the present state and dictates the validation path forward.

## Verified Checklist (Evidence-Backed)

| Item | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Repo root + monorepo layout | ✅ Verified | `/workspace/summit` | Root is active; pnpm workspace present. |
| Agent/orchestrator surface | ✅ Verified | `src/agents/`, `src/longhorizon/`, `src/maestro/` | Orchestration-related code exists under these paths. |
| Test runner(s) | ✅ Verified | `package.json` (`jest`, `vitest`) | Jest is primary via `pnpm test`; Vitest also present. |
| Lint/format tooling | ✅ Verified | `package.json` (`eslint`, `prettier`) | Root scripts expose lint/format tasks. |
| CI workflow names (core gates) | ✅ Verified | `.github/workflows/ci-core.yml`, `.github/workflows/ci-security.yml` | Names exist in repo. |
| Agent guardrail workflows | ✅ Verified | `.github/workflows/agent-guardrails.yml`, `.github/workflows/agentic-plan-gate.yml` | Guardrail workflows exist in repo. |

## Assumed Checklist (Deferred Pending Verification)

| Item | Status | Evidence Target | Notes |
| --- | --- | --- | --- |
| Orchestrator entrypoint(s) for CLI/runtime | **Deferred pending `src/cli` + `src/agents` scan** | `src/cli/`, `src/agents/` | Identify canonical entrypoint(s) before wiring new modules. |
| Evidence schema (current canonical) | **Deferred pending governance scan** | `docs/governance/`, `evidence/` | Align new evidence artifacts to existing schema. |
| Branch protection required checks | **Deferred pending policy scan** | `.github/`, `scripts/ci/` | Confirm required check names and gate order. |
| “Must-not-touch” zone list | **Intentionally constrained** | `docs/governance/`, `policies/`, `security/` | Maintain immutability until scoped validation completes. |

## Must-Not-Touch List (Intentionally Constrained)

Until the deferred items above are verified, the following areas are **off-limits** for edits:

1. **Governance + Policy engines**: `docs/governance/`, `policies/`, `policy/`, `opa/`.
2. **Security enforcement + credentials**: `security/`, `secrets/`, `keys/`.
3. **Evidence schemas + canonical compliance artifacts**: `evidence/`, `COMPLIANCE_*`, `SOC_*`.
4. **CI gates definitions**: `.github/workflows/*` (except where explicitly scoped by a future task plan).

## Validation Plan (Next Actions)

1. Enumerate orchestrator entrypoints under `src/cli/` and `src/agents/` and lock a canonical path.
2. Inspect evidence schema under `docs/governance/` and `evidence/` to align new artifacts.
3. Confirm branch protection checks via `scripts/ci/*` and workflow name mapping.
4. Update this document with verified paths and lift constraints only after evidence is captured.

**Status:** Present state asserted; future changes constrained until validation completes.

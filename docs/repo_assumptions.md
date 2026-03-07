# Repo Assumptions — ai-platform-daily-2026-02-07

**Status:** Intentionally constrained pending in-repo validation.
**Item Slug:** ai-platform-daily-2026-02-07

## Verified (from provided path map)

- Runtime: **Node 18+**, **TypeScript**, **pnpm**, GitHub Actions.
- Canonical paths:
  - `.github/workflows/{ci-core.yml,ci-pr.yml,ci-security.yml,ci-verify.yml,codeql.yml,agent-guardrails.yml,agentic-plan-gate.yml,_reusable-*.yml}`
  - `.github/{actions/,scripts/,policies/,MILESTONES/}`
  - `src/{api/graphql,api/rest,agents,connectors,graphrag}`
  - `tests/<module>/...`, `tests/e2e/...` (via pnpm scripts)
- Docs layout: `docs/{architecture,api,security}` with suggested extensions `docs/{governance,operations,ga}`.

## Assumed (must validate in repo)

- Actual existing agent runtime entrypoints under `src/agents/` (names, interfaces).
- Existing policy engine format under `.github/policies/` (OPA vs custom).
- Evidence schema conventions (filenames, JSON structure).
- Current CI job names inside the workflows (exact `name:` fields).

## Must-not-touch list (until validated)

- `.github/workflows/codeql.yml`
- Any production deployment workflows (if present)
- DB migration directories (if present)
- Secrets / encrypted configs

## Validation checklist (before PRs merge)

- Confirm `.github/workflows/*` filenames + required checks in branch protection.
- Confirm `src/agents` architecture (planner/executor/observer?) and how tools are defined today.
- Confirm logging/telemetry stack (to wire MCP audit + drift detector).
- Confirm test runner + assertion libs (`pnpm test:*`).

# AI Civilization Stack Assumptions
Verified: current governance surfaces, CI policy surfaces, existing top-level folders above.
Assumed: exact ownership of simulation/graph/governance modules, exact test harness naming, exact report artifact conventions.
Must-not-touch files:
- docs/ci/REQUIRED_CHECKS_POLICY.yml
- scripts/release/reconcile_branch_protection.sh
- .github/workflows/** (unless CI-gate PR)
- .opa/policy/** (unless policy-gate PR)

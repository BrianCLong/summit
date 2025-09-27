# Summit Quality Gates & Evidence Plan

## Overview
This plan establishes the automated evidence required for Summit release trains to merge. It links backlog acceptance criteria to measurable tests, datasets, and CI quality gates so that Product, QA, and SRE leaders share a single definition of done.

## Coverage Objectives
- **Server (Node)**: ≥90% line/branch/function coverage for touched modules. Circuit breaker, policy, and orchestration helpers have per-file thresholds enforced in Jest.
- **Client (React)**: ≥85% statements/branches on changed components with visual regressions traced through Playwright screenshots.
- **Shared packages**: ≥80% with mutation score targets documented in Stryker reports.
- **Change failure rate**: <5% by blocking merges when coverage deltas exceed 2% drop on any layer.

## Quality Gate Pipeline
1. `pnpm lint` – ESLint on workspaces, Markdownlint on docs touched by the PR.
2. `pnpm typecheck` – Project-wide TS program builds (server, client, shared packages).
3. `pnpm run -r test -- --coverage` – Jest unit + integration suites with coverage enforcement. Server adds circuit breaker regression tests that exercise failure threshold, latency P95, and recovery logic.
4. `pnpm --filter server playwright test --config server/playwright.config.ts --grep @slo` – API/E2E SLO pack (new health latency spec) providing contract evidence.
5. `k6 run tests/load/health-p95.k6.js` – Load probe validating API P95 < 400 ms @ 50 vus baseline.
6. `npm run sbom` – CycloneDX SBOM generation archived as evidence and diffed for license regressions.
7. `npm run policy:test` – OPA bundle simulation using `quality_gates_test.rego` to assert SLO, coverage, and SBOM artefacts satisfy risk policy.
8. `bash scripts/ci/run-quality-gates.sh` – Orchestrates the previous commands locally/CI and emits junit-style summary for dashboards.

All gates must be green to merge. Failures raise `quality-gate` GitHub status checks and block the PR.

## Acceptance Evidence Bundles
Each epic produces a versioned acceptance pack stored under `tests/acceptance/` containing:
- `README.md` – Context, AC mapping, manual fallback, and runbooks.
- `scenarios.yaml` – Declarative list of tests (Jest, Playwright, K6, chaos, policy) with owning team.
- `evidence.yaml` – Paths to artefacts (coverage lcov, playwright traces, k6 summary, opa bundle, sbom digest).
- `fixtures/` – Golden datasets (GraphQL payloads, latency samples, persona accounts) reused across suites.

During CI the pack is zipped and uploaded to the artefact bucket with metadata for compliance.

## Load & Chaos Strategy
- **Load (k6)**: Health and graph search workloads ramp to 50 VUs/5m ensuring `http_req_duration{p95}<400ms` and error rate <1%.
- **Chaos (Litmus)**: Network latency injection against the graph gateway pod verifies the circuit breaker remains CLOSED and SLO budgets are not burned. Results captured in `tests/chaos/control-plane-latency-experiment.yaml`.

## Policy & Supply Chain Controls
- `quality_gates_test.rego` ensures:
  - Coverage ≥ targets per epic.
  - Latest SBOM exists and contains no forbidden licenses.
  - Chaos experiments recorded within 30 days.
- SBOM diffing ties to `scripts/ci/run-quality-gates.sh` so a stale SBOM fails the build.

## Reporting
CI publishes:
- `test-results/junit.xml` – Unit/integration evidence.
- `server/tests/e2e/.playwright-report` – E2E traces/screenshots.
- `tests/load/output/health-p95-summary.json` – Load metrics with SLO evaluation.
- `artifacts/acceptance/<epic>/` – Packaged acceptance bundles.

Dashboards ingest the above and update the QA quality gate board automatically.

# Automated Test Policy Enforcement

This document explains how the continuous integration (CI) pipeline enforces the automated test quality policies. It also includes command examples for running the same checks locally.

## Overview of Required Gates

Every pull request must satisfy the following policies before it can merge:

1. **Unit test coverage ≥ 85% for all new or modified production files.**
2. **API integration and contract tests must pass.**
3. **End-to-end (E2E) regression tests covering the critical user journeys must pass.**
4. **Synthetic performance benchmarks for key analytical operations must finish within 500 ms.**
5. **No new `console.log` statements may be introduced in production code.**
6. **All newly added async/await usage must include explicit error handling (try/catch or a `.catch()` chain).**

Failing any gate blocks the pull request, posts a review comment with remediation steps, and requires the author to push fixes.

## GitHub Actions Workflow

The workflow lives at `.github/workflows/test-policy.yml` and executes on every `pull_request` event. It performs these high-level steps:

1. Checks out the code and installs Node.js dependencies.
2. Runs the consolidated policy suite (`npm run test:policy`).
3. Uploads the machine-readable report (`test-policy-report.json`).
4. Comments on the pull request when any gate fails, summarising the failing checks and remediation guidance.
5. Fails the workflow when one or more gates do not pass, which prevents the PR from merging until the issues are resolved.

The policy suite invokes dedicated modules under `scripts/ci/` for coverage analysis, console logging audits, async error handling verification, and performance benchmarks.

## Running the Policy Suite Locally

```bash
npm install
npm run lint
npm run typecheck
npm run test:policy
```

`npm run test:policy` executes the same logic as CI. It uses the current branch diff against `origin/main` (override with `TEST_POLICY_BASE=<branch>` if needed).

## Coverage Enforcement

- Command: `npm run test:jest -- --coverage --coverageReporters=json-summary --passWithNoTests --runInBand`
- Scope: All changed `.ts`, `.tsx`, `.js`, `.jsx` files outside of test directories.
- Threshold: 85% for statements, branches, functions, and lines.
- Failure remediation: add or enhance unit tests covering the uncovered logic, break down complex functions, or refactor to more testable units.

The coverage module fails when:

- Jest exits with a non-zero status.
- The coverage summary cannot be produced.
- No coverage data is generated for a changed file.
- Any metric falls below 85%.

## Integration & Contract Tests

- **Integration tests:** `npm run test:integration`
- **Contract/API tests:** `npm run test:api`

These suites validate request/response paths, data loaders, and persisted query contracts. When they fail, investigate the API logic or adjust the fixture data to match the desired behaviour before re-running the command.

## End-to-End Regression Tests

- Command: `npm run test:e2e`
- Tooling: Playwright
- Coverage: Authentication, investigator workspace navigation, collaborative graph analysis, and export flows.

Remediation tips:

- Reproduce the failing scenario locally with `npx playwright test --debug`.
- Capture updated screenshots when UI changes are intentional.
- Stabilise flaky selectors with `data-testid` attributes.

## Performance Benchmarks

- Command: `node scripts/ci/performance-benchmark.cjs`
- Targets: graph traversal, risk aggregation, JSON serialisation hot paths.
- Threshold: 500 ms per operation.

If an operation exceeds 500 ms:

1. Profile the code path (e.g., `node --prof`, Chrome DevTools profiler).
2. Optimise algorithms, caching, or data access patterns.
3. Re-run `node scripts/ci/performance-benchmark.cjs` until all operations pass.

## Logging and Async Safety Policies

### Console Logging

The console log scanner inspects only the lines added in the PR. Any new `console.log` usage under `src/`, `apps/`, `services/`, or `packages/` fails the gate. Replace it with the appropriate structured logger (e.g., `pino`, `winston`) or remove debugging statements entirely.

### Async Error Handling

The async scanner parses the changed source files with the TypeScript compiler API. It flags `await` expressions that are both:

- On newly added lines, and
- Not wrapped in a `try { ... } catch { ... }` block and not chained with `.catch()`.

To remediate, wrap the awaited call in a try/catch and handle errors gracefully, or attach an explicit `.catch()` handler.

## Pre-Commit Hooks

Husky now enforces linting and type-checking before allowing commits:

1. Secret scan: `npx gitleaks protect --staged --verbose`
2. Linting: `npm run lint`
3. Type checking: `npm run typecheck`
4. File-level auto-fixes: `lint-staged`

Run these commands before committing to catch issues early and avoid CI failures.

## Troubleshooting

| Symptom                                          | Possible Cause                              | Suggested Fix                                                                  |
| ------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------ |
| Coverage gate fails with “Missing coverage data” | Jest did not execute tests for the new file | Add or update tests that import the file, or adjust test discovery patterns    |
| Integration tests cannot connect to dependencies | Local services not running                  | Start required services (`npm run dev` or docker compose) before running tests |
| Playwright tests timing out                      | UI changed, selectors stale                 | Update tests with resilient selectors or increase `expect` timeouts            |
| Performance gate exceeds budget                  | Algorithmic regression, larger fixtures     | Profile the code, optimise loops/data structures, or reduce fixture size       |

## Additional Resources

- [Testing strategy overview](../README.md) _(if applicable)_
- `scripts/ci/*.cjs` for implementation details of each policy check
- `test-policy-report.json` artifact produced by CI for detailed diagnostics

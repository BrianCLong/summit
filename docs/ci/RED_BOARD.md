# CI RED BOARD

**Status:** RED
**Last Updated:** 2026-02-26
**Owner:** Antigravity

## Top 3 Blockers

### 1. Unit Test Failures (Redis/Database Connection)
*   **Job + Step:** `Unit Tests` and `test (20.x)` workflows / `Run unit tests` step.
*   **Failure Class:** *Real test regression / Flaky infra* (Missing mocks).
*   **Root Cause:** Tests are attempting to connect to a real Redis instance (`localhost:6379`) instead of using mocks. `ioredis` is not globally mocked in `server/jest.setup.js`.
*   **Fix Plan:** Implement a global mock for `ioredis` in `server/jest.setup.js` and ensure all database-dependent tests are properly isolated or mocked.
*   **Link to run(s):** [Simulated local failure]

### 2. Mandatory Branch Protection Audit Gate
*   **Job + Step:** `CI Core Gate ✅` / `branch-protection-drift` job.
*   **Failure Class:** *Policy miswire / missing secret*.
*   **Root Cause:** The `branch-protection-drift` job explicitly fails if `BRANCH_PROTECTION_READ_TOKEN` is missing. This secret is often missing in PRs from forks or if not configured in certain environments, blocking the entire `CI Core Gate ✅`.
*   **Fix Plan:** Modify the drift check to emit a warning and skip (as a governed exception) instead of hard-failing when the required token is unavailable, especially in `pull_request` context.
*   **Link to run(s):** `.github/workflows/ci-core.yml:640`

### 3. GA Verification Gate Failures
*   **Job + Step:** `ga-gate.yml` / `gate` job / `Run GA Verification` step.
*   **Failure Class:** *Tooling/version / ESM mismatch*.
*   **Root Cause:** `ga:verify` runs a full build/lint/test suite in a single script (`ga-verify-runner.mjs`). It fails on type stub conflicts (`@types/hapi__catbox`) and potential ESM/CJS mismatches during `pnpm typecheck` and root-level `lint`.
*   **Fix Plan:** Narrow the scope of `ga:verify` or fix the specific type stub issues. Ensure the runner handles ESM correctly and uses workspace-aware commands.
*   **Link to run(s):** `.github/workflows/ga-gate.yml:45`

## Next 5 Blockers (Queue)

1.  **Redundant Toolchain Setup:** Multiple workflows call `pnpm/action-setup` and `setup-node` twice or in suboptimal order, slowing down CI and causing intermittent cache issues.
2.  **Missing Template Files:** Some tests depend on `server/templates/reports/sample.handlebars` which might be missing in some environments.
3.  **Actionlint Noise:** `workflow-validity.yml` might fail on non-critical lint issues or missing `merge_group` handling in some newly added workflows.
4.  **Deterministic Build Flakes:** `deterministic-build` job in `ci-core.yml` can be sensitive to timestamps or environment differences if not properly sanitized.
5.  **E2E Flakes:** Playwright tests in `golden-path` often time out waiting for services to stabilize.

## Do Not Touch

*   **Application Runtime Logic:** Unless specifically required to fix a test failure, avoid touching `server/src` or `apps/web/src` to minimize blast radius.
*   **Security Policy Evaluation (Rego):** OPA policies in `policy/` are authoritative; do not weaken them to pass CI. Fix the inputs or the test environment instead.

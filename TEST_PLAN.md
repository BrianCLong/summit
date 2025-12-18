# Test Plan for CI Improvements

## Changes Made
1.  **Fail-Fast Architecture**: Restructured `pr-validation.yml` to run fast checks (lint, typecheck, build) first. If these fail, the workflow stops immediately, saving resources and time.
2.  **Deterministic Timing**: Added explicit `timeout-minutes` to all jobs to prevent hanging processes.
3.  **Stability**:
    -   Used `fail-fast: true` in matrix strategies.
    -   Added `k6` SLO probe integration via Docker to ensure performance regressions are caught.
    -   Improved dependency management with `pnpm install --frozen-lockfile` and caching (assumed via setup actions).
4.  **Policy Gating**: Updated the OPA policy evaluation step to use dynamic job results (`needs.<job>.result`) instead of hardcoded values, ensuring the policy reflects the actual pipeline status.

## Verification Steps

### 1. Syntax Validation
-   [x] Verify YAML syntax of `.github/workflows/pr-validation.yml`. (Manual review performed).
-   [x] Check OPA policy input generation script matches policy schema.

### 2. Job dependency Flow
-   **Trigger**: Open a PR or push to an existing PR.
-   **Step 1: Triage**: Checks if PR is draft. Calculates risk level.
-   **Step 2: Fast Checks**: Runs lint, typecheck, build.
    -   *Expected Behavior*: If lint fails, `matrix-validation` and `e2e-gates` should NOT run.
-   **Step 3: Matrix Validation**: Runs unit tests and security scans in parallel.
    -   *Expected Behavior*: If unit tests fail, the workflow should fail fast.
-   **Step 4: E2E Gates**: Runs only if Risk Level is `HIGH`.
    -   *Expected Behavior*: Spins up Docker Compose, runs Playwright, then runs k6 SLO probe.
    -   *Validation*: Check logs for `k6` output.
-   **Step 5: Policy Decision**: Runs always (if triage passed).
    -   *Expected Behavior*: Evaluates `input.json` against `.github/policies/summit-quality-gates.rego`.Fails if criteria are not met.

### 3. SLO Verification
-   The `k6/slo-probe.js` script checks for:
    -   p95 Latency < 200ms
    -   Error Rate < 1%
-   *Test*: Run `docker run --network host -i grafana/k6 run -e BASE_URL=http://localhost:4000 - < k6/slo-probe.js` locally against a running dev server to confirm it works.

### 4. Backwards Compatibility
-   The workflow triggers on the same events (`pull_request`).
-   It uses existing scripts (`pnpm run test`, `pnpm run build`).
-   It respects the existing OPA policy logic.

## Rollback Plan
If the new workflow fails to trigger or reports false negatives:
1.  Revert changes to `.github/workflows/pr-validation.yml`.
2.  Investigate logs for variable expansion issues or OPA input mismatches.

# Quality Gates & Policies

Our quality gates ensure that bad code is rejected early, while good code ships fast.

## 1. Pull Request (PR) Gates

A PR **cannot** merge unless:

1.  **Build Passes:** `pnpm build` succeeds for affected packages.
2.  **Lint/Typecheck:** `eslint` and `tsc` pass with no errors.
3.  **Unit Tests:** All unit tests pass.
4.  **Integration Tests:** Affected integration tests pass.
5.  **Smoke Tests:** Golden Path E2E smoke test passes (if UI/API changes detected).
6.  **No Coverage Regression:** Code coverage % for the modified files must not decrease.

## 2. Release Gates

A release candidate **cannot** be promoted to Production unless:

1.  **Full E2E Suite:** All Playwright scenarios pass on Staging.
2.  **Performance:** Critical API endpoints meet p95 latency SLOs (< 500ms).
3.  **Security:** Container scan (Trivy) finds no Critical/High vulnerabilities.
4.  **Migrations:** Database migration simulation succeeds (Up -> Down -> Up).

## 3. Flaky Test Policy

Flaky tests destroy trust. We treat them aggressively.

### The "Quarantine" Process
1.  **Identification:** If a test fails in CI but passes on retry, it is **Flaky**.
2.  **Tagging:** Immediately tag the test with `@flaky` (Jest) or `@fixme` (Playwright).
    *   *Action:* This excludes it from the Blocking PR Gate.
3.  **Ticket:** A Jira/GitHub Issue is created automatically (or manually) linked to the test.
4.  **SLA:** The team owning the service has **1 Sprint** to fix or delete the test.
5.  **Exile:** If not fixed in 1 Sprint, the test is deleted. A test that doesn't run reliably is worse than no test.

## 4. Error Budgets & Release Decisions

*   **Green State:** Recent releases have low error rates. Deployment is automated.
*   **Yellow State:** Error budget (SLO) is at risk. Deployments require manual approval.
*   **Red State:** Error budget depleted. **Feature Freeze**. Only reliability fixes are allowed to merge.

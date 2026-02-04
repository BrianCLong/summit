# Testing Minimums

## Pyramid
1.  **Unit Tests**: High coverage required for business logic and utilities.
2.  **Integration Tests**: Key workflows (e.g., Scorecard generation, Database queries).
3.  **E2E Tests**: Critical paths (Login -> Core Value Prop).

## Requirements
*   **New Code**: Must include unit tests.
*   **Bug Fixes**: Must include a regression test (a test that fails without the fix).
*   **Execution Governor**: Any change to execution scripts requires running the test suite.

## Coverage Targets
*   **Unit**: 80% line coverage for core packages.
*   **Integration**: Cover happy paths and common error states.

## CI Enforcement
*   CI pipelines run tests on every PR.
*   PRs with failing tests cannot be merged.

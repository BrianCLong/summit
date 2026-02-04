# Golden Path E2E Tests

This project contains the critical "golden path" end-to-end tests for the Summit platform.
These tests cover the critical user journeys for the consolidated frontend.

## Structure

*   `tests/`: Test specs
*   `pages/`: Page Objects (POM)
*   `fixtures/`: Test data

## Running Locally

1.  Start the consolidated frontend:
    ```bash
    ../../scripts/ci/start_consolidated_frontend.sh
    ```
2.  Run tests:
    ```bash
    # Smoke test (minimal)
    GOLDEN_PATH_E2E_ENABLED=1 npx playwright test

    # Full journey
    GOLDEN_PATH_E2E_ENABLED=1 GOLDEN_PATH_JOURNEY=full npx playwright test
    ```

## Configuration

*   `GOLDEN_PATH_E2E_ENABLED`: Set to `1` to run tests.
*   `GOLDEN_PATH_JOURNEY`: Set to `full` to run the full journey, or `basic` (default) for just dashboard load.
*   `BASE_URL`: Target URL (default `http://localhost:3000`).

# Golden Path E2E Tests

<<<<<<< HEAD
These tests cover the critical user journeys for the consolidated frontend.

## Running Tests

```bash
# Smoke test (minimal)
GOLDEN_PATH_E2E_ENABLED=1 npm test

# Full journey
GOLDEN_PATH_E2E_ENABLED=1 GOLDEN_PATH_JOURNEY=full npm test
```

## Structure

- `pages/`: Page Object Models
- `tests/`: Test specifications
- `fixtures/`: Test data
=======
This project contains the critical "golden path" end-to-end tests for the Summit platform.

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
    GOLDEN_PATH_E2E_ENABLED=1 npx playwright test
    ```

## Configuration

*   `GOLDEN_PATH_E2E_ENABLED`: Set to `1` to run tests.
*   `GOLDEN_PATH_JOURNEY`: Set to `full` to run the full journey, or `basic` (default) for just dashboard load.
*   `BASE_URL`: Target URL (default `http://localhost:3000`).
>>>>>>> 50f8d7925a (feat: add golden path E2E test harness for consolidated frontend)

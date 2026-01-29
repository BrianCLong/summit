# Golden Path E2E Tests

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

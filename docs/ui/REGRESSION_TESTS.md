# UI Regression Tests

## Purpose
This directory contains regression tests for critical UI components. These tests render components with specific states and assert that their DOM structure remains stable using snapshots.

## How to Run
To run the regression tests:

```bash
cd apps/web
npm run ui:test
```

## How to Update Snapshots
If you make intentional changes to the UI that affect the DOM structure (e.g., adding classes, changing hierarchy), the tests will fail. To update the snapshots:

```bash
cd apps/web
npm run ui:test -- -u
```

## Structure
- `apps/web/ui-tests/regression/`: Contains the test files.
- `apps/web/package.json`: Contains the `ui:test` script.

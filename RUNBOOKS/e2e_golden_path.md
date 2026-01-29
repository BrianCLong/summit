# E2E Golden Path Runbook

## Overview
This runbook covers the operation, troubleshooting, and maintenance of the Golden Path E2E test suite.

## Policy Gates
The suite enforces a "deny-by-default" policy for secrets in artifacts.
- **Redaction Gate:** Scans `artifacts/evidence` for `SECRET=`, `TOKEN=`, etc.
- **Failure:** If CI fails on "Policy Gate Failed", check generated artifacts for leaked environment variables or tokens.

## How to Debug
1. Download `playwright-report` from GitHub Actions.
2. View trace.zip in https://trace.playwright.dev.
3. Locally run: `GOLDEN_PATH_E2E_ENABLED=1 npm test` in `e2e/golden-path`.

## Quarantining Tests
To skip a flaky test without removing code:
```ts
test.fixme('reason', async ({ page }) => { ... });
```

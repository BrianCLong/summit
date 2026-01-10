# Flake Quarantine

## Overview

The CI pipeline includes a **Flake Quarantine** mechanism to ensure that known flaky tests do not block the merge train or release process, while ensuring they are still visible and tracked.

## Mechanism

1.  **Tracking:** Flaky tests are listed in `test-quarantine.json`.
2.  **Exclusion:** The main `test` job in `ci.yml` retrieves this list and excludes these tests using `--testPathIgnorePatterns`.
3.  **Execution:** A separate `test-quarantined` job runs *only* these quarantined tests. This job is `continue-on-error: true`, meaning failures here do not block the PR, but results are visible in the GitHub Actions summary.
4.  **Management:** The quarantine list is managed via the `Test Quarantine Manager` workflow (`test-quarantine.yml`) or the CLI script `scripts/release/manage_test_quarantine.sh`.

## How to Quarantine a Test

### Via CLI (Local)

```bash
./scripts/release/manage_test_quarantine.sh quarantine --test "path/to/flaky.test.ts" --reason "Fails intermittently on CI"
```

Then commit and push `test-quarantine.json` and `docs/releases/_state/quarantine_state.json`.

### Via GitHub Actions

Trigger the **Test Quarantine Manager** workflow manually with `action: quarantine` (if implemented) or simply open a PR modifying `test-quarantine.json`.

## How to Unquarantine

Once a flaky test is fixed:

```bash
./scripts/release/manage_test_quarantine.sh unquarantine --test "path/to/flaky.test.ts"
```

## Quarantine Policy

*   **Criteria:** Tests that fail >3 times in 24 hours without code changes are candidates.
*   **Expiry:** Quarantined tests should be fixed within 14 days. Stale entries are flagged in the weekly report.
*   **Protection:** Critical security and auth tests cannot be quarantined (defined in `docs/ci/TEST_QUARANTINE_POLICY.yml`).

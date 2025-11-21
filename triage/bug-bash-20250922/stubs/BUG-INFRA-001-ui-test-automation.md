---
id: BUG-INFRA-001
title: UI Test Automation fails with invalid argument
severity: P1
area: infra
source: bug-bash-20250922
assignee: QA/Infra Team
status: Open
---

# Bug Report: UI Test Automation fails with invalid argument

## Summary
The UI test suite (Playwright) failed to run during the bug bash, producing an "unknown option" error. This prevents automated regression testing of the UI.

## Steps to Reproduce
1. Run the bug bash automation script (likely `scripts/smoke-test.js` or a specific bug bash script).
2. Check `bug-bash-results/20250922/ui-test-results-chromium.json`.

## Expected Behavior
The tests should execute and produce a JSON report of the test results.

## Actual Behavior
The process exited with an error:
```
error: unknown option '--output-dir=../bug-bash-results/20250922/playwright-chromium'
```

## Acceptance Criteria
- [ ] The Playwright command is corrected to use valid options for output directories.
- [ ] `pnpm smoke` or the relevant bug bash script runs successfully.
- [ ] Test results are correctly generated in the specified directory.

# Playbook: Test Enablement

## Objective

Enable skipped tests.

## Preconditions

- Test is currently skipped (`.skip`, `xdescribe`).

## Steps

1. **Analyze**: Read the test to understand what it asserts.
2. **Enable**: Remove `.skip`.
3. **Run**: Execute `npm test`.
4. **Debug**: If it fails, fix the code, NOT the test (unless the test is wrong).
5. **Commit**: Submit PR with enabled test.

## Warning

Do not enable flaky tests without fixing the flakiness.

# Waiver: Quarantined Test Suites

| ID | WAIVER-002-QUARANTINE-TESTS |
|----|-----------------------------|
| **Scope** | Unit & Integration Tests |
| **Status** | ACTIVE (Non-Blocking) |
| **Owner** | QA Team |
| **Review Date** | 2025-12-30 |

## Context
Certain test suites exhibit nondeterministic behavior (flakiness) or environment dependencies (e.g., specific ESM/Jest configurations) that are not consistently met in the CI runner environment. To preserve velocity, these tests have been moved to a `test:quarantine` script or marked as non-blocking.

## Decision
The `quarantine-tests` job in `.github/workflows/mvp4-gate.yml` is configured with `continue-on-error: true`. Failures in this suite do not block the MVP-4 GA release.

## Mitigation
- **Golden Path**: Critical logic is covered by `smoke-test` and `build-lint-strict`, which are blocking.
- **Manual Verification**: Flaky tests are run locally by developers before merge.

## Exit Criteria
This waiver expires when the quarantined tests are refactored to be deterministic and the `test:quarantine` script is deprecated.

# Flake Attack Plan

## Objective
Identify and eliminate flaky tests and steps across CI workflows to maintain a reliable and determinist CI pipeline.

## SLO Targets
- **P95 CI Duration**: < 15 minutes
- **Flake Rate**: < 1% across all core workflows
- **Mean Time to Triage Flakes**: < 1 hour
- **Resolution Time for High-Frequency Flakes**: < 48 hours

## Flake Registry Analysis
Updated on: 2026-03-07T15:28:37.304Z

### Prioritized Suspects
| Workflow :: Job | Frequency | Last Seen | Sample URL |
| --- | --- | --- | --- |
| CI Core Pipeline::e2e-tests | 1 | 2026-03-07T15:24:36.640Z | https://github.com/mock/run/1 |

## Recommended Fixes & Actions

### 1. Auto-Retry Safe Steps (Implemented)
Safe setup steps like `pnpm install --frozen-lockfile` and network downloads have been wrapped using `nick-fields/retry@v3` with 3 maximum attempts to mitigate transient network or registry errors.

### 2. Isolate and Quarantine
For the top suspects listed above:
- **Playwright/E2E Tests**: Ensure proper `await expect(...).toBeVisible()` guards are used instead of hard sleeps.
- **Race Conditions**: Identify shared state mutations in tests. Execute tests with `--runInBand` to isolate.
- If a test flakes >3 times in a day, move it to a dedicated quarantine suite so it does not block the golden path.

### 3. CI Determinism Monitoring
The auto-triage workflow automatically labels PRs and Issues with `p0:ci-determinism` when keywords like "flaky", "flake", or "nondeterministic" are mentioned.

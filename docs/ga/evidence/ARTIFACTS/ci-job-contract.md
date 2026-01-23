# CI Job Contract (Golden Path)

## Workflow Name
CI

## Required Jobs
### config-guard
- Must run before dependency installation.
- Must execute: `pnpm -w check:jest-config`
- Expected runtime: seconds
- Timeout: 5 minutes

### unit-tests
- Must depend on `config-guard`.
- Must execute install deterministically: `pnpm -w install --frozen-lockfile`
- Must execute canonical unit tests.
- Timeout: 10 minutes

## Branch Protection
- Require status checks:
  - `CI / config-guard`
  - `CI / unit-tests`
- Require branch up-to-date before merging: enabled
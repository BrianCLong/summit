# Branch Protection Required Checks

**Target Branch:** `main`

To ensure the Security Merge Policy and CI Trust Separation are enforced, the following GitHub Branch Protection settings are required:

## 1. Require Status Checks to Pass

The following status checks MUST be required before merge:

### Core Build & Test

- `build (server)`
- `build (client)`
- `test (unit)`
- `smoke-test` (Golden Path)

### Security Gates

- `security-policy-check` (Enforces SECURITY_MERGE_POLICY.yml)
- `CodeQL`
- `dependency-review`

## 2. CI/CD Isolation

- **Require branches to be up to date before merging**: YES.
- **Require signed commits**: YES.
- **Do not allow bypassing this settings**: YES (Admin implementation).

## 3. Review Policy

- **Require Pull Request reviews**: YES.
- **Required approving reviews**: 1.
- **Require review from Code Owners**: YES.

## Notes on Implementation

- The `security-policy-check` is a synthesized check run by the `security-gate` workflow.
- Ensure `CodeQL` analysis is triggered on PRs targeting `main`.

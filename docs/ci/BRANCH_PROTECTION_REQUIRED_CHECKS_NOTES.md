# Branch Protection Required Checks

**Target Branch:** `main`

To ensure the Security Merge Policy and CI Trust Separation are enforced, the following GitHub Branch Protection settings are required.

> **Note:** GitHub branch protection must use the **exact job/check names** from CI runs. The “Canonical” names below are stable policy identifiers; the “GitHub check names” are the strings that must appear in the Branch protection UI for `main` and be selected as required status checks.

## 1. Require Status Checks to Pass

The following status checks MUST be required before merge:

### Core Build & Test

- **Canonical:** `build (server)`
  - **GitHub Check Name:** `build`
  - **Notes:** Single `build` job currently covers server/client.

- **Canonical:** `build (client)`
  - **GitHub Check Name:** `build`
  - **Notes:** Covered by the same `build` job above.

- **Canonical:** `test (unit)`
  - **GitHub Check Name:** `test (20.x)`
  - **Notes:** Main unit test job.

- **Canonical:** `smoke-test`
  - **GitHub Check Name:** `Accessibility + keyboard smoke`
  - **Notes:** Currently serving as the golden-path smoke test.

### Security Gates

- **Canonical:** `security-policy-check`
  - **GitHub Check Names:** `Security Audit`, `enforce-policy`
  - **Notes:** Both distinct enforcement layers must be required.

- **Canonical:** `CodeQL`
  - **GitHub Check Names:**
    - `Analyze (python)`
    - `Analyze (go)`
    - `Analyze (javascript-typescript)`
  - **Notes:** All language analysis jobs must pass.

- **Canonical:** `dependency-review`
  - **GitHub Check Name:** `supply-chain-integrity`
  - **Notes:** Enforces supply chain security.

### Legacy / Optional Checks (For reference)

- `Gitleaks baseline scan (blocking)` (Candidate for future requirement)

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
